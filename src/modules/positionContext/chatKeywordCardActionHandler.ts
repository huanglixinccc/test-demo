import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { TASK_CLOSED_LINK_ACTION } from "./chatKeywordCards.js"
import { dispatchChatKeywordReply } from "./chatKeywordReply.js"

interface CardActionEvent {
  operator?: { open_id?: string }
  action?: {
    tag?: string
    value?: unknown
  }
}

function readActionValue(value: unknown): Record<string, unknown> | null {
  if (value == null) return null
  if (typeof value === "string") {
    try {
      return readActionValue(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (typeof value !== "object") return null
  return value as Record<string, unknown>
}

export function makeChatKeywordCardActionHandler(im: FeishuIM): CardActionHandler {
  return async function handle(envelope: DecryptedEnvelope) {
    const ev = envelope.event as CardActionEvent
    const operatorOpenId = ev.operator?.open_id
    const record = readActionValue(ev.action?.value)
    if (!record || record.action !== TASK_CLOSED_LINK_ACTION) return null

    const message = typeof record.message === "string" ? record.message : undefined
    if (!operatorOpenId || !message) {
      return { toast: { type: "error", content: "无法识别操作，请重试" } }
    }

    logger.info({ openId: operatorOpenId, message }, "chatKeyword.task_closed_link")
    try {
      await dispatchChatKeywordReply(im, operatorOpenId, message)
    } catch (err) {
      logger.error({ err, openId: operatorOpenId, message }, "chatKeyword.task_closed_link_failed")
      return { toast: { type: "error", content: "发送失败，请稍后重试" } }
    }

    return null
  }
}
