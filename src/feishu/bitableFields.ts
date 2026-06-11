import type { CandidateStatus, ReviewResult } from "./bitable.js"

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

export const REVIEW_RESULT_VALUES: readonly ReviewResult[] = ["通过", "待定", "淘汰"]
const REVIEW_RESULT_SET = new Set<string>(REVIEW_RESULT_VALUES)

/** Candidate statuses that need an Interview row for HR to schedule. */
export const INTERVIEW_STAGE_STATUSES: readonly CandidateStatus[] = ["技术面", "HR面"]

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

export function isReviewResult(value: string | undefined): value is ReviewResult {
  return Boolean(value && REVIEW_RESULT_SET.has(value))
}

export function normalizeReviewResult(raw: unknown): ReviewResult | undefined {
  const value = normalizeBitableFieldValue(raw)
  return isReviewResult(value) ? value : undefined
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

/** Pull reviewResult from webhook action_list when interviewer submits review. */
export function extractReviewResultFromAction(
  action: BitableRecordAction,
): ReviewResult | undefined {
  if (action.action !== "record_edited") return undefined
  for (const field of action.after_value ?? []) {
    const value = normalizeReviewResult(field.field_value)
    if (value) return value
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

/** Interview row is still waiting for HR to schedule (not yet in active interview). */
export function isInterviewPendingSchedule(status: string | undefined): boolean {
  if (!status) return true
  // "未通知" sometimes lands in interviewStatus when HR confuses the two columns.
  return status === "待安排" || status === "未通知"
}

export function isInterviewAlreadyNotified(notificationStatus: string | undefined): boolean {
  return notificationStatus === "已通知" || notificationStatus === "已提醒面评"
}
