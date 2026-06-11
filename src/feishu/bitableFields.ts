import type { CandidateStatus } from "./bitable.js"

export const CANDIDATE_STATUS_VALUES: readonly CandidateStatus[] = [
  "待筛选",
  "初筛通过",
  "技术面",
  "HR面",
  "Offer",
  "入职",
  "淘汰",
]

const CANDIDATE_STATUS_SET = new Set<string>(CANDIDATE_STATUS_VALUES)

/** Normalize a Bitable field value from GET record API or webhook after_value. */
export function normalizeBitableFieldValue(raw: unknown): string | undefined {
  if (raw == null) return undefined
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return undefined
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        return normalizeBitableFieldValue(parsed)
      } catch {
        return trimmed
      }
    }
    return trimmed
  }
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw)
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const v = normalizeBitableFieldValue(item)
      if (v) return v
    }
    return undefined
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>
    if (typeof o.text === "string" && o.text.trim()) return o.text.trim()
    if (typeof o.name === "string" && o.name.trim()) return o.name.trim()
    if (typeof o.option === "string" && o.option.trim()) return o.option.trim()
  }
  return undefined
}

export function isCandidateStatus(value: string | undefined): value is CandidateStatus {
  return Boolean(value && CANDIDATE_STATUS_SET.has(value))
}

export interface BitableRecordActionField {
  field_id?: string
  field_value?: unknown
}

export interface BitableRecordAction {
  record_id?: string
  action?: "record_added" | "record_edited" | "record_deleted" | string
  before_value?: BitableRecordActionField[]
  after_value?: BitableRecordActionField[]
}

/** Pull status from webhook action_list when HR edits the status column. */
export function extractCandidateStatusFromAction(
  action: BitableRecordAction,
): string | undefined {
  if (action.action !== "record_edited") return undefined
  for (const field of action.after_value ?? []) {
    const value = normalizeBitableFieldValue(field.field_value)
    if (isCandidateStatus(value)) return value
  }
  return undefined
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Parse a Feishu user open_id from Bitable text / rich-text field values. */
export function normalizeOpenId(raw: unknown): string | undefined {
  const v = normalizeBitableFieldValue(raw)
  if (!v) return undefined
  if (/^ou_[a-z0-9]{8,}$/i.test(v)) return v
  const match = v.match(/ou_[a-z0-9]{8,}/i)
  return match?.[0]
}
