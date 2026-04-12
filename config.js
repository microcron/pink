export const SEARCH_MODEL = "perplexity/sonar"
export const REASON_MODEL = "anthropic/claude-sonnet-4.5"
export const JSON_ROLLING_WINDOW = 3
export const REASON_MODEL_QUERY = "Send me a ntfy"
export const REASON_MODEL_SYS_PROMPT = `Contact me via ntfy by using the following format:
\`\`\`ntfy#
<Your msg>
\`\`\`
Replace # with the priority level (1-3). Use priority 3 when there is fresh updates/news. Don't ask any questions, always send me a ntfy by using the triple backticks format.`
