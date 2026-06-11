import type { BitableTables, CandidateStatus, ReviewResult } from "../../feishu/bitable.js"
import type { FeishuIM } from "../../feishu/im.js"
import { bus } from "../../events/bus.js"
import { nextCandidateStatus } from "./stateMachine.js"
import { buildInterviewNotifyCard, buildHrSummaryText } from "./notify.js"
import { logger } from "../../utils/logger.js"

export interface InterviewAgentDeps {
  bitable: BitableTables
  im: FeishuIM
  hrOpenIds: string[]
}

export function registerInterviewAgent(deps: InterviewAgentDeps): void {
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
      const currentStatus = (candidate?.fields.status ?? "待筛选") as CandidateStatus
      const nextStatus = nextCandidateStatus(currentStatus, payload.reviewResult as ReviewResult)

      await deps.bitable.updateInterview(payload.interviewRecordId, {
        interviewStatus: "已完成",
      })

      if (candidate && nextStatus !== currentStatus) {
        await deps.bitable.updateCandidate(candidate.record_id, { status: nextStatus })
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
