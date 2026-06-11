import type { CandidateFields, CandidateStatus } from "../../feishu/bitable.js"
import type { BitableRecord } from "../../feishu/bitable.js"
import { normalizeBitableFieldValue } from "../../feishu/bitableFields.js"

export interface FunnelStats {
  resume: number
  screen: number
  interview: number
  offer: number
  onboard: number
}

const SCREEN_PLUS: ReadonlySet<CandidateStatus> = new Set([
  "初筛通过",
  "技术面",
  "HR面",
  "Offer",
  "入职",
])

const INTERVIEW_PLUS: ReadonlySet<CandidateStatus> = new Set([
  "技术面",
  "HR面",
  "Offer",
  "入职",
])

const OFFER_PLUS: ReadonlySet<CandidateStatus> = new Set(["Offer", "入职"])

export function computeFunnel(
  records: BitableRecord<CandidateFields>[],
): FunnelStats {
  let resume = 0
  let screen = 0
  let interview = 0
  let offer = 0
  let onboard = 0

  for (const r of records) {
    const raw = normalizeBitableFieldValue(r.fields.status)
    if (!raw) continue
    resume += 1
    if (SCREEN_PLUS.has(raw as CandidateStatus)) screen += 1
    if (INTERVIEW_PLUS.has(raw as CandidateStatus)) interview += 1
    if (OFFER_PLUS.has(raw as CandidateStatus)) offer += 1
    if (raw === "入职") onboard += 1
  }

  return { resume, screen, interview, offer, onboard }
}

export function filterCandidates(
  records: BitableRecord<CandidateFields>[],
  opts: { position?: string | null; startTime?: number; endTime?: number },
): BitableRecord<CandidateFields>[] {
  const pos = opts.position?.trim().toLowerCase()
  return records.filter((r) => {
    const createdAt = r.fields.createdAt ?? 0
    if (opts.startTime != null && createdAt < opts.startTime) return false
    if (opts.endTime != null && createdAt > opts.endTime) return false
    if (pos) {
      const position = (normalizeBitableFieldValue(r.fields.position) ?? "").toLowerCase()
      if (!position.includes(pos) && !pos.includes(position)) return false
    }
    return true
  })
}
