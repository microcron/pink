export const SEARCH_MODEL = "perplexity/sonar"
export const REASON_MODEL = "anthropic/claude-sonnet-4.5"
export const JSON_ROLLING_WINDOW = 3
export const REASON_MODEL_QUERY = "Send me a ntfy"
export const REASON_MODEL_SYS_PROMPT = `You can contact me via ntfy by using the following format:
\`\`\`ntfy#
<Your msg>
\`\`\`
Replace # with the priority level (1-3). Use priority 3 when there is fresh updates/news.`
