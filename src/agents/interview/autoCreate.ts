import type { BitableTables, CandidateStatus } from "../../feishu/bitable.js"
import type { CandidateStatusChangedPayload } from "../../events/types.js"
import { INTERVIEW_STAGE_STATUSES, isCandidateStatus } from "../../feishu/bitableFields.js"
import { logger } from "../../utils/logger.js"

export async function ensureInterviewShell(
  bitable: BitableTables,
  payload: CandidateStatusChangedPayload,
): Promise<void> {
  if (!isCandidateStatus(payload.status)) return
  if (!INTERVIEW_STAGE_STATUSES.includes(payload.status)) return

  const existing = await bitable.findOpenInterviewByCandidateId(payload.candidateId)
  if (existing) {
    logger.info(
      { candidateId: payload.candidateId, recordId: existing.record_id },
      "interviewAgent.shell_exists_skip",
    )
    return
  }

  try {
    const record = await bitable.createInterview({
      candidateId: payload.candidateId,
      candidateName: payload.candidateName || "候选人",
      interviewStatus: "待安排",
      notificationStatus: "未通知",
    })
    logger.info(
      {
        candidateId: payload.candidateId,
        stage: payload.status,
        interviewRecordId: record.record_id,
      },
      "interviewAgent.shell_created",
    )
  } catch (err) {
    logger.error({ err, candidateId: payload.candidateId }, "interviewAgent.shell_create_failed")
  }
}

export function isInterviewStage(status: CandidateStatus): boolean {
  return INTERVIEW_STAGE_STATUSES.includes(status)
}
