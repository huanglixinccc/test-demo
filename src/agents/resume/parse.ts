import type { AIProvider } from "../../ai/provider.js"
import { RESUME_SYSTEM_PROMPT, buildResumeUserPrompt } from "./prompts.js"

export interface ParsedResume {
  name: string | null
  phone: string | null
  email: string | null
  position: string | null
  yearsOfExperience: number | null
  skills: string[]
}

export async function parseResume(ai: AIProvider, text: string): Promise<ParsedResume> {
  const raw = await ai.chat(
    [
      { role: "system", content: RESUME_SYSTEM_PROMPT },
      { role: "user", content: buildResumeUserPrompt(text) },
    ],
    { temperature: 0.1, maxTokens: 800 },
  )

  const parsed = extractJson(raw)
  return normalize(parsed)
}

function extractJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // fall through to regex extraction
  }
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`LLM did not return JSON. raw=${trimmed.slice(0, 200)}`)
  return JSON.parse(match[0])
}

function normalize(o: Record<string, unknown>): ParsedResume {
  const skills = Array.isArray(o.skills)
    ? (o.skills as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 8)
    : []
  return {
    name: stringOrNull(o.name),
    phone: stringOrNull(o.phone),
    email: stringOrNull(o.email),
    position: stringOrNull(o.position),
    yearsOfExperience: typeof o.yearsOfExperience === "number" ? o.yearsOfExperience : null,
    skills,
  }
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null
}

export function hasAnyKeyField(p: ParsedResume): boolean {
  return Boolean(p.name || p.phone || p.email)
}
