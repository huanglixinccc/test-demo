import type { AIProvider } from "../../ai/provider.js"
import type { CandidateFields, JobDescriptionFields } from "../../feishu/bitable.js"
import { normalizeBitableFieldValue } from "../../feishu/bitableFields.js"
import { JD_MATCH_SYSTEM_PROMPT, buildJdMatchUserPrompt } from "./prompts.js"

export type MatchPriority = "高" | "中" | "低"

export interface JdMatchResult {
  score: number
  priority: MatchPriority
  highlights: string[]
  gaps: string[]
}

export function scoreToPriority(score: number): MatchPriority {
  if (score >= 80) return "高"
  if (score >= 60) return "中"
  return "低"
}

export async function scoreCandidateAgainstJd(
  ai: AIProvider,
  candidate: Pick<CandidateFields, "name" | "position" | "skills">,
  jd: JobDescriptionFields,
): Promise<JdMatchResult> {
  const raw = await ai.chat(
    [
      { role: "system", content: JD_MATCH_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildJdMatchUserPrompt({
          position: normalizeBitableFieldValue(jd.position) ?? jd.position,
          requirement: normalizeBitableFieldValue(jd.requirement) ?? jd.requirement,
          candidateName: normalizeBitableFieldValue(candidate.name),
          candidateSkills: Array.isArray(candidate.skills) ? candidate.skills.map(String) : [],
          candidatePosition: normalizeBitableFieldValue(candidate.position),
        }),
      },
    ],
    { temperature: 0.1, maxTokens: 500 },
  )

  const parsed = extractJson(raw)
  return normalizeMatchResult(parsed)
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

function normalizeMatchResult(o: Record<string, unknown>): JdMatchResult {
  const scoreRaw = typeof o.score === "number" ? o.score : Number(o.score)
  const score = Number.isFinite(scoreRaw) ? Math.min(100, Math.max(0, Math.round(scoreRaw))) : 0
  const priorityRaw = typeof o.priority === "string" ? o.priority.trim() : ""
  const priority: MatchPriority =
    priorityRaw === "高" || priorityRaw === "中" || priorityRaw === "低"
      ? priorityRaw
      : scoreToPriority(score)

  const highlights = Array.isArray(o.highlights)
    ? (o.highlights as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 3)
    : []
  const gaps = Array.isArray(o.gaps)
    ? (o.gaps as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 3)
    : []

  return { score, priority, highlights, gaps }
}
