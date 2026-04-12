import { readdir, readFile, writeFile } from "fs/promises"
import { SEARCH_MODEL, JSON_ROLLING_WINDOW } from "./config.js"

const DIR = "?"
const files = (await readdir(DIR)).filter(f => f.endsWith(".json"))

for (const file of files) {
  const query = file.replace(/\.json$/, "")
  const path = `${DIR}/${file}`
  const now = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC"

  console.log(`>> ${query}`)

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: SEARCH_MODEL,
      messages: [{ role: "user", content: query }]
    })
  })

  if (!res.ok) {
    console.error(`!! ${file}: ${res.status} ${await res.text()}`)
    continue
  }

  const data = await res.json()
  const answer = data.choices?.[0]?.message?.content ?? "No response."

  let entries = []
  try {
    const raw = await readFile(path, "utf-8")
    const parsed = JSON.parse(raw || "[]")
    if (Array.isArray(parsed)) entries = parsed
  } catch {}

  entries.unshift({ date: now, response: answer })
  entries = entries.slice(0, JSON_ROLLING_WINDOW)

  await writeFile(path, JSON.stringify(entries, null, 2) + "\n")
  console.log(`<< ${file} (${entries.length} entries)`)
}
