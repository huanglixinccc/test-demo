import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { BitableTables, CandidateFields, InterviewFields } from "../bitable.js"
import { bus } from "../../events/bus.js"
import { logger } from "../../utils/logger.js"

interface BitableChangeEvent {
  file_token?: string
  table_id: string
  action_list?: Array<{ record_id: string }>
  record_id?: string
}

export function makeBitableChangeHandler(opts: {
  bitable: BitableTables
  interviewTableId: string
  candidateTableId?: string
}) {
  return async function handle(envelope: DecryptedEnvelope): Promise<void> {
    const ev = envelope.event as BitableChangeEvent
    const recordIds = ev.action_list?.map((a) => a.record_id)
      ?? (ev.record_id ? [ev.record_id] : [])

    if (ev.table_id === opts.interviewTableId) {
      for (const recordId of recordIds) {
        let record
        try {
          record = await opts.bitable.getInterview(recordId)
        } catch (err) {
          logger.error({ err, recordId }, "bitableChange.get_interview_failed")
          continue
        }
        dispatchInterview(record.record_id, record.fields)
      }
      return
    }

    if (opts.candidateTableId && ev.table_id === opts.candidateTableId) {
      for (const recordId of recordIds) {
        let record
        try {
          record = await opts.bitable.getCandidate(recordId)
        } catch (err) {
          logger.error({ err, recordId }, "bitableChange.get_candidate_failed")
          continue
        }
        dispatchCandidate(record.record_id, record.fields)
      }
      return
    }

    logger.debug({ tableId: ev.table_id }, "bitableChange.skip.other_table")
  }
}

export function dispatchCandidate(recordId: string, fields: CandidateFields): void {
  const status = fields.status
  const candidateId = fields.candidateId
  // Status field must be populated for us to act. Skip rows still being created
  // (HR auto-save fires events with partial fields).
  if (!status || !candidateId) {
    logger.debug({ recordId }, "bitableChange.candidate.skip_partial")
    return
  }
  bus.emit("CandidateStatusChanged", {
    candidateRecordId: recordId,
    candidateId,
    candidateName: fields.name ?? "",
    status,
  })
}

export function dispatchInterview(recordId: string, fields: InterviewFields): void {
  const interviewerOpenId = fields.interviewerOpenId
  const interviewTime = fields.interviewTime
  const status = fields.interviewStatus
  const notificationStatus = fields.notificationStatus

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
      candidateId: fields.candidateId ?? "",
      candidateName: fields.candidateName ?? "",
      interviewerName: fields.interviewerName ?? "",
      interviewerOpenId,
      interviewTime,
    })
    return
  }

  if (fields.reviewResult && status !== "已完成") {
    bus.emit("ReviewSubmitted", {
      interviewRecordId: recordId,
      candidateId: fields.candidateId ?? "",
      candidateName: fields.candidateName ?? "",
      interviewerName: fields.interviewerName ?? "",
      reviewContent: fields.reviewContent ?? "",
      reviewResult: fields.reviewResult,
    })
    return
  }

  logger.debug({ recordId, status }, "bitableChange.no_dispatch")
}
