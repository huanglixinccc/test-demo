import type { AIProvider } from "../../ai/provider.js"
import { ANALYTICS_SYSTEM_PROMPT, buildAnalyticsUserPrompt } from "./prompts.js"
import type { AnalyticsPeriod } from "./period.js"

export interface ParsedAnalyticsQuery {
  position: string | null
  period: AnalyticsPeriod
}

export function isAnalyticsIntent(text: string): boolean {
  const t = text.trim()
  if (/漏斗|招聘统计|数据报表|招聘数据|候选人统计/.test(t)) return true
  if (/情况$|统计$/.test(t) && /岗位|招聘|候选|漏斗/.test(t)) return true
  return false
}

export async function parseAnalyticsQuery(
  ai: AIProvider,
  text: string,
): Promise<ParsedAnalyticsQuery> {
  const raw = await ai.chat(
    [
      { role: "system", content: ANALYTICS_SYSTEM_PROMPT },
      { role: "user", content: buildAnalyticsUserPrompt(text) },
    ],
    { temperature: 0.1, maxTokens: 200 },
  )
  const parsed = extractJson(raw)
  return normalize(parsed)
}

function extractJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // fall through
  }
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`LLM did not return JSON. raw=${trimmed.slice(0, 200)}`)
  return JSON.parse(match[0])
}

function normalize(o: Record<string, unknown>): ParsedAnalyticsQuery {
  const position =
    typeof o.position === "string" && o.position.trim() ? o.position.trim() : null
  const periodRaw = typeof o.period === "string" ? o.period : "this_month"
  const period: AnalyticsPeriod =
    periodRaw === "last_month" || periodRaw === "all" ? periodRaw : "this_month"
  return { position, period }
}
