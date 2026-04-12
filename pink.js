import { readdir, readFile, writeFile } from "fs/promises"
import {
  SEARCH_MODEL, REASON_MODEL, JSON_ROLLING_WINDOW,
  REASON_MODEL_QUERY, REASON_MODEL_SYS_PROMPT
} from "./config.js"

const DIR = "?"
const files = (await readdir(DIR)).filter(f => f.endsWith(".json"))

async function chat(model, messages, system) {
  const body = { model, messages }
  if (system) body.messages = [{ role: "system", content: system }, ...messages]
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? "No response."
}

async function sendNtfy(msg, priority) {
  const url = process.env.NTFY_URL
  if (!url) return console.warn("!! NTFY_URL not set")
  const res = await fetch(url, {
    method: "POST",
    headers: { "Priority": String(priority) },
    body: msg
  })
  if (!res.ok) console.error(`!! ntfy ${res.status}: ${await res.text()}`)
  else console.log(`📨 ntfy (p${priority}): ${msg.slice(0, 80)}`)
}

for (const file of files) {
  const query = file.replace(/\.json$/, "")
  const path = `${DIR}/${file}`
  const now = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC"

  console.log(`>> ${query}`)

  let messages = []
  try {
    const raw = await readFile(path, "utf-8")
    const parsed = JSON.parse(raw || "[]")
    if (Array.isArray(parsed)) messages = parsed
  } catch {}

  // --- Search Model ---
  const searchAnswer = await chat(SEARCH_MODEL, [
    ...messages,
    { role: "user", content: query }
  ]).catch(e => { console.error(`!! search ${file}: ${e.message}`); return null })

  if (!searchAnswer) continue

  messages.push(
    { role: "user", content: query },
    { role: "assistant", content: `${now}: ${searchAnswer}` }
  )

  // --- Reason Model ---
  const reasonAnswer = await chat(REASON_MODEL, [
    ...messages,
    { role: "user", content: REASON_MODEL_QUERY }
  ], REASON_MODEL_SYS_PROMPT).catch(e => {
    console.error(`!! reason ${file}: ${e.message}`)
    return null
  })

  if (!reasonAnswer) continue

  messages.push(
    { role: "user", content: REASON_MODEL_QUERY },
    { role: "assistant", content: reasonAnswer }
  )

  // --- Parse ntfy block ---
  const ntfyMatch = reasonAnswer.match(/```ntfy([1-5])\n([\s\S]*?)```/)
  if (ntfyMatch) await sendNtfy(ntfyMatch[2].trim(), parseInt(ntfyMatch[1]))
  else console.warn(`!! no ntfy block found in reason response for ${file}`)

  // --- Trim to rolling window (each window = 4 messages) ---
  const windowSize = 4
  const maxMessages = JSON_ROLLING_WINDOW * windowSize
  if (messages.length > maxMessages)
    messages = messages.slice(messages.length - maxMessages)

  await writeFile(path, JSON.stringify(messages, null, 2) + "\n")
  console.log(`<< ${file} (${messages.length / windowSize} windows)`)
}
