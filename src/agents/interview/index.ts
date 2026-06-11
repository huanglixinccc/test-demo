import type { BitableTables, CandidateStatus, ReviewResult } from "../../feishu/bitable.js"
import type { FeishuIM } from "../../feishu/im.js"
import { bus } from "../../events/bus.js"
import { normalizeBitableFieldValue, isCandidateStatus } from "../../feishu/bitableFields.js"
import { ensureInterviewShell } from "./autoCreate.js"
import { nextCandidateStatus } from "./stateMachine.js"
import { buildInterviewNotifyCard, buildHrSummaryText } from "./notify.js"
import { logger } from "../../utils/logger.js"

export interface InterviewAgentDeps {
  bitable: BitableTables
  im: FeishuIM
  hrOpenIds: string[]
}

export function registerInterviewAgent(deps: InterviewAgentDeps): void {
  bus.on("CandidateStatusChanged", async (payload) => {
    await ensureInterviewShell(deps.bitable, payload)
  })

  bus.on("InterviewScheduled", async (payload) => {
    try {
      const card = buildInterviewNotifyCard({
        candidateName: payload.candidateName,
        interviewerName: payload.interviewerName,
        interviewTime: payload.interviewTime,
        recordId: payload.interviewRecordId,
      })
      await deps.im.sendCardToUser(payload.interviewerOpenId, card)
      await deps.bitable.updateInterview(payload.interviewRecordId, {
        interviewStatus: "待面试",
        notificationStatus: "已通知",
      })
    } catch (err) {
      logger.error({ err }, "interviewAgent.scheduled.failed")
    }
  })

  bus.on("ReviewSubmitted", async (payload) => {
    try {
      const candidate = await deps.bitable.findCandidateByCandidateId(payload.candidateId)
      const rawStatus = normalizeBitableFieldValue(candidate?.fields.status)
      const currentStatus = (
        isCandidateStatus(rawStatus) ? rawStatus : "待筛选"
      ) as CandidateStatus
      const nextStatus = nextCandidateStatus(currentStatus, payload.reviewResult)

      await deps.bitable.updateInterview(payload.interviewRecordId, {
        interviewStatus: "已完成",
      })

      if (candidate && nextStatus !== currentStatus) {
        await deps.bitable.updateCandidate(candidate.record_id, { status: nextStatus })
        logger.info(
          {
            candidateId: payload.candidateId,
            from: currentStatus,
            to: nextStatus,
            reviewResult: payload.reviewResult,
          },
          "interviewAgent.candidate_status_updated",
        )
        bus.emit("CandidateStatusChanged", {
          candidateRecordId: candidate.record_id,
          candidateId: payload.candidateId,
          candidateName: payload.candidateName,
          status: nextStatus,
        })
      } else if (!candidate) {
        logger.error(
          { candidateId: payload.candidateId },
          "interviewAgent.candidate_not_found_for_review",
        )
      } else {
        logger.info(
          { candidateId: payload.candidateId, currentStatus, reviewResult: payload.reviewResult },
          "interviewAgent.candidate_status_unchanged",
        )
      }

      const text = buildHrSummaryText({
        candidateName: payload.candidateName,
        reviewerName: payload.interviewerName,
        reviewResult: payload.reviewResult,
        nextStatus,
      })
      for (const openId of deps.hrOpenIds) {
        try {
          await deps.im.sendTextToUser(openId, text)
        } catch (err) {
          logger.error({ err, openId }, "interviewAgent.hr_notify.failed")
        }
      }
    } catch (err) {
      logger.error({ err }, "interviewAgent.review.failed")
    }
  })
}
