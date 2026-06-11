import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { BitableTables, CandidateFields, InterviewFields, ReviewResult } from "../bitable.js"
import {
  type BitableRecordAction,
  extractCandidateStatusFromAction,
  extractReviewResultFromAction,
  normalizeBitableFieldValue,
  normalizeReviewResult,
  sleep,
} from "../bitableFields.js"
import { bus } from "../../events/bus.js"
import { logger } from "../../utils/logger.js"

interface BitableChangeEvent {
  file_token?: string
  table_id: string
  action_list?: BitableRecordAction[]
  record_id?: string
}

export function makeBitableChangeHandler(opts: {
  bitable: BitableTables
  interviewTableId: string
  candidateTableId?: string
}) {
  return async function handle(envelope: DecryptedEnvelope): Promise<void> {
    const ev = envelope.event as BitableChangeEvent
    const recordIds = collectRecordIds(ev)

    logger.info(
      { tableId: ev.table_id, recordCount: recordIds.length, actions: ev.action_list?.length ?? 0 },
      "bitableChange.received",
    )

    if (ev.table_id === opts.interviewTableId) {
      const actionsByRecord = indexActionsByRecord(ev.action_list)
      for (const recordId of recordIds) {
        const reviewFromEvent = extractReviewFromActions(actionsByRecord.get(recordId))
        let record
        try {
          record = await fetchInterviewWithRetry(opts.bitable, recordId)
        } catch (err) {
          logger.error({ err, recordId }, "bitableChange.get_interview_failed")
          continue
        }
        dispatchInterview(record.record_id, record.fields, reviewFromEvent)
      }
      return
    }

    if (opts.candidateTableId && ev.table_id === opts.candidateTableId) {
      const actionsByRecord = indexActionsByRecord(ev.action_list)
      for (const recordId of recordIds) {
        const statusFromEvent = extractStatusFromActions(actionsByRecord.get(recordId))
        let record
        try {
          record = await fetchCandidateWithRetry(opts.bitable, recordId)
        } catch (err) {
          logger.error({ err, recordId }, "bitableChange.get_candidate_failed")
          continue
        }
        dispatchCandidate(record.record_id, record.fields, statusFromEvent)
      }
      return
    }

    logger.debug(
      {
        tableId: ev.table_id,
        interviewTableId: opts.interviewTableId,
        candidateTableId: opts.candidateTableId,
      },
      "bitableChange.skip.other_table",
    )
  }
}

function collectRecordIds(ev: BitableChangeEvent): string[] {
  const fromActions = ev.action_list?.map((a) => a.record_id).filter(Boolean) as string[] | undefined
  if (fromActions?.length) return [...new Set(fromActions)]
  return ev.record_id ? [ev.record_id] : []
}

function indexActionsByRecord(
  actions: BitableRecordAction[] | undefined,
): Map<string, BitableRecordAction[]> {
  const map = new Map<string, BitableRecordAction[]>()
  for (const action of actions ?? []) {
    if (!action.record_id) continue
    const list = map.get(action.record_id) ?? []
    list.push(action)
    map.set(action.record_id, list)
  }
  return map
}

function extractStatusFromActions(actions: BitableRecordAction[] | undefined): string | undefined {
  for (const action of actions ?? []) {
    const status = extractCandidateStatusFromAction(action)
    if (status) return status
  }
  return undefined
}

function extractReviewFromActions(
  actions: BitableRecordAction[] | undefined,
): ReviewResult | undefined {
  for (const action of actions ?? []) {
    const review = extractReviewResultFromAction(action)
    if (review) return review
  }
  return undefined
}

async function fetchInterviewWithRetry(
  bitable: BitableTables,
  recordId: string,
): Promise<Awaited<ReturnType<BitableTables["getInterview"]>>> {
  const delays = [0, 400, 900]
  let lastErr: unknown
  for (const delay of delays) {
    if (delay > 0) await sleep(delay)
    try {
      return await bitable.getInterview(recordId)
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

async function fetchCandidateWithRetry(
  bitable: BitableTables,
  recordId: string,
): Promise<Awaited<ReturnType<BitableTables["getCandidate"]>>> {
  const delays = [0, 400, 900]
  let lastErr: unknown
  for (const delay of delays) {
    if (delay > 0) await sleep(delay)
    try {
      return await bitable.getCandidate(recordId)
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

export function dispatchCandidate(
  recordId: string,
  fields: CandidateFields,
  statusOverride?: string,
): void {
  const status = statusOverride ?? normalizeBitableFieldValue(fields.status)
  const candidateId = normalizeBitableFieldValue(fields.candidateId)
  const candidateName = normalizeBitableFieldValue(fields.name) ?? ""

  if (!status || !candidateId) {
    logger.info({ recordId, status, candidateId }, "bitableChange.candidate.skip_partial")
    return
  }

  logger.info({ recordId, candidateId, status, fromEvent: Boolean(statusOverride) }, "bitableChange.candidate.dispatch")

  bus.emit("CandidateStatusChanged", {
    candidateRecordId: recordId,
    candidateId,
    candidateName,
    status,
  })
}

export function dispatchInterview(
  recordId: string,
  fields: InterviewFields,
  reviewResultOverride?: ReviewResult,
): void {
  const interviewerOpenId = normalizeBitableFieldValue(fields.interviewerOpenId)
  const interviewTime = fields.interviewTime
  const status = normalizeBitableFieldValue(fields.interviewStatus)
  const notificationStatus = normalizeBitableFieldValue(fields.notificationStatus)
  const reviewResult = reviewResultOverride ?? normalizeReviewResult(fields.reviewResult)
  const candidateId = normalizeBitableFieldValue(fields.candidateId) ?? ""
  const candidateName = normalizeBitableFieldValue(fields.candidateName) ?? ""
  const interviewerName = normalizeBitableFieldValue(fields.interviewerName) ?? ""
  const reviewContent = normalizeBitableFieldValue(fields.reviewContent) ?? ""

  // Treat empty/undefined status as "待安排" (newly created row, HR hasn't
  // explicitly picked a status). This matches Feishu's auto-save UX where
  // each field change fires an event but key fields (interviewer / time) are
  // already in place.
  const isPendingSchedule = !status || status === "待安排"

  if (
    isPendingSchedule
    && interviewerOpenId
    && interviewTime
    && notificationStatus !== "已通知"
    && notificationStatus !== "已提醒面评"
  ) {
    bus.emit("InterviewScheduled", {
      interviewRecordId: recordId,
      candidateId,
      candidateName,
      interviewerName,
      interviewerOpenId,
      interviewTime,
    })
    return
  }

  if (reviewResult && status !== "已完成") {
    logger.info(
      { recordId, candidateId, reviewResult, fromEvent: Boolean(reviewResultOverride) },
      "bitableChange.review.dispatch",
    )
    bus.emit("ReviewSubmitted", {
      interviewRecordId: recordId,
      candidateId,
      candidateName,
      interviewerName,
      reviewContent,
      reviewResult,
    })
    return
  }

  logger.debug({ recordId, status, reviewResult }, "bitableChange.no_dispatch")
}
