import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { BitableTables, InterviewFields } from "../bitable.js"
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
}) {
  return async function handle(envelope: DecryptedEnvelope): Promise<void> {
    const ev = envelope.event as BitableChangeEvent
    if (ev.table_id !== opts.interviewTableId) {
      logger.debug({ tableId: ev.table_id }, "bitableChange.skip.other_table")
      return
    }

    const recordIds = ev.action_list?.map((a) => a.record_id)
      ?? (ev.record_id ? [ev.record_id] : [])

    for (const recordId of recordIds) {
      let record
      try {
        record = await opts.bitable.getInterview(recordId)
      } catch (err) {
        logger.error({ err, recordId }, "bitableChange.get_failed")
        continue
      }
      dispatchInterview(record.record_id, record.fields)
    }
  }
}

export function dispatchInterview(recordId: string, fields: InterviewFields): void {
  const interviewerOpenId = fields.interviewerOpenId
  const interviewTime = fields.interviewTime
  const status = fields.interviewStatus
  const notificationStatus = fields.notificationStatus

  if (
    status === "待安排"
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
