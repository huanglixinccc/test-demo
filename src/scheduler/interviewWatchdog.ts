import cron from "node-cron"
import type { BitableTables } from "../feishu/bitable.js"
import type { FeishuIM } from "../feishu/im.js"
import {
  decideWatchdogAction,
  TRANSITION_TO_REVIEW_MS,
  type WatchdogAction,
} from "../agents/interview/escalation.js"
import {
  buildAttendanceCheckText,
  buildHrNoShowText,
  buildHrReviewOverdueText,
  buildReviewReminderText,
  formatInterviewTime,
} from "../agents/interview/notify.js"
import { normalizeBitableFieldValue } from "../feishu/bitableFields.js"
import { logger } from "../utils/logger.js"

export interface InterviewWatchdogDeps {
  bitable: BitableTables
  im: FeishuIM
  hrOpenIds: string[]
}

export interface WatchdogRunResult {
  processed: number
  attendanceChecks: number
  reviewReminders: number
  noShowEscalations: number
  reviewHrEscalations: number
  transitions: number
}

export async function runInterviewWatchdogOnce(
  deps: InterviewWatchdogDeps,
  now = Date.now(),
): Promise<WatchdogRunResult> {
  const result: WatchdogRunResult = {
    processed: 0,
    attendanceChecks: 0,
    reviewReminders: 0,
    noShowEscalations: 0,
    reviewHrEscalations: 0,
    transitions: 0,
  }

  const rows = await deps.bitable.listAllInterviews()
  for (const row of rows) {
    const fields = row.fields
    let status = normalizeBitableFieldValue(fields.interviewStatus)
    const interviewTime = fields.interviewTime ?? 0

    if (
      status === "待面试" &&
      interviewTime > 0 &&
      now - interviewTime >= TRANSITION_TO_REVIEW_MS &&
      !normalizeBitableFieldValue(fields.reviewContent)?.trim()
    ) {
      await deps.bitable.updateInterview(row.record_id, { interviewStatus: "待面评" })
      status = "待面评"
      result.transitions += 1
    }

    const action = decideWatchdogAction({
      interviewStatus: status,
      interviewTime: fields.interviewTime,
      reviewContent: normalizeBitableFieldValue(fields.reviewContent),
      exceptionType: normalizeBitableFieldValue(fields.exceptionType),
      exceptionStatus: normalizeBitableFieldValue(fields.exceptionStatus),
      escalationLevel: fields.escalationLevel ?? 0,
      now,
    })

    if (action.type === "none") continue

    result.processed += 1
    try {
      await applyWatchdogAction(deps, row.record_id, fields, action, now, result)
    } catch (err) {
      logger.error({ err, recordId: row.record_id, action: action.type }, "watchdog.action_failed")
    }
  }

  return result
}

async function applyWatchdogAction(
  deps: InterviewWatchdogDeps,
  recordId: string,
  fields: Awaited<ReturnType<BitableTables["getInterview"]>>["fields"],
  action: WatchdogAction,
  now: number,
  result: WatchdogRunResult,
): Promise<void> {
  const interviewerOpenId = normalizeBitableFieldValue(fields.interviewerOpenId)
  const candidateName = normalizeBitableFieldValue(fields.candidateName) ?? "候选人"
  const interviewTime = fields.interviewTime ?? 0
  const when = interviewTime ? formatInterviewTime(interviewTime) : "—"

  switch (action.type) {
    case "attendance_check": {
      if (interviewerOpenId) {
        await deps.im.sendTextToUser(
          interviewerOpenId,
          buildAttendanceCheckText({ candidateName, interviewTime: when }),
        )
      }
      await deps.bitable.updateInterview(recordId, {
        escalationLevel: 1,
        lastRemindedAt: now,
      })
      result.attendanceChecks += 1
      return
    }

    case "review_remind": {
      if (interviewerOpenId) {
        await deps.im.sendTextToUser(interviewerOpenId, buildReviewReminderText(candidateName))
      }
      await deps.bitable.updateInterview(recordId, {
        notificationStatus: "已提醒面评",
        escalationLevel: Math.max(fields.escalationLevel ?? 0, 2),
        lastRemindedAt: now,
      })
      result.reviewReminders += 1
      return
    }

    case "no_show_escalate": {
      await deps.bitable.updateInterview(recordId, {
        exceptionType: "候选人爽约",
        exceptionStatus: "待处理",
        escalationLevel: 3,
        lastRemindedAt: now,
      })
      const hrText = buildHrNoShowText({ candidateName, interviewTime: when, recordId })
      await notifyHr(deps, hrText)
      if (interviewerOpenId) {
        await deps.im.sendTextToUser(
          interviewerOpenId,
          `已通知 HR：候选人 ${candidateName} 面试（${when}）疑似爽约，请在表格确认或补充说明。`,
        )
      }
      result.noShowEscalations += 1
      return
    }

    case "review_hr_escalate": {
      await deps.bitable.updateInterview(recordId, {
        exceptionType: "面评超时",
        exceptionStatus: "待处理",
        escalationLevel: 3,
        lastRemindedAt: now,
      })
      const hrText = buildHrReviewOverdueText({
        candidateName,
        interviewTime: when,
        interviewerName: normalizeBitableFieldValue(fields.interviewerName) ?? "—",
        recordId,
      })
      await notifyHr(deps, hrText)
      result.reviewHrEscalations += 1
      return
    }
  }
}

async function notifyHr(deps: InterviewWatchdogDeps, text: string): Promise<void> {
  for (const openId of deps.hrOpenIds) {
    if (!openId) continue
    try {
      await deps.im.sendTextToUser(openId, text)
    } catch (err) {
      logger.error({ err, openId }, "watchdog.hr_notify_failed")
    }
  }
}

export function startInterviewWatchdog(
  deps: InterviewWatchdogDeps,
  cronExpr = "*/5 * * * *",
): void {
  cron.schedule(cronExpr, async () => {
    try {
      const result = await runInterviewWatchdogOnce(deps)
      if (result.processed > 0) {
        logger.info(result, "interviewWatchdog.tick")
      }
    } catch (err) {
      logger.error({ err }, "interviewWatchdog.tick.failed")
    }
  })
}

/** @deprecated Use runInterviewWatchdogOnce; kept for existing tests. */
export async function runReviewReminderOnce(
  deps: Pick<InterviewWatchdogDeps, "bitable" | "im">,
  now = Date.now(),
): Promise<number> {
  const full: InterviewWatchdogDeps = { ...deps, hrOpenIds: [] }
  const result = await runInterviewWatchdogOnce(full, now)
  return result.reviewReminders
}

/** @deprecated Use startInterviewWatchdog */
export function startReviewReminder(
  deps: Pick<InterviewWatchdogDeps, "bitable" | "im">,
  cronExpr = "*/5 * * * *",
): void {
  startInterviewWatchdog({ ...deps, hrOpenIds: [] }, cronExpr)
}
