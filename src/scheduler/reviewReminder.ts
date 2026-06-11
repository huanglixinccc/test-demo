import cron from "node-cron"
import type { BitableTables } from "../feishu/bitable.js"
import type { FeishuIM } from "../feishu/im.js"
import { buildReviewReminderText } from "../agents/interview/notify.js"
import { logger } from "../utils/logger.js"

export interface ReviewReminderDeps {
  bitable: BitableTables
  im: FeishuIM
}

export async function runReviewReminderOnce(
  deps: ReviewReminderDeps,
  now = Date.now(),
): Promise<number> {
  const rows = await deps.bitable.listInterviewsNeedingReminder(now)
  let sent = 0
  for (const row of rows) {
    const openId = row.fields.interviewerOpenId
    const name = row.fields.candidateName ?? ""
    if (!openId) continue
    try {
      await deps.im.sendTextToUser(openId, buildReviewReminderText(name))
      await deps.bitable.updateInterview(row.record_id, { notificationStatus: "已提醒面评" })
      sent++
    } catch (err) {
      logger.error({ err, recordId: row.record_id }, "reviewReminder.send_failed")
    }
  }
  return sent
}

export function startReviewReminder(
  deps: ReviewReminderDeps,
  cronExpr = "*/5 * * * *",
): void {
  cron.schedule(cronExpr, async () => {
    try {
      const n = await runReviewReminderOnce(deps)
      if (n > 0) logger.info({ sent: n }, "reviewReminder.tick")
    } catch (err) {
      logger.error({ err }, "reviewReminder.tick.failed")
    }
  })
}
