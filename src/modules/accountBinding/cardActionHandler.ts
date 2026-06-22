import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { START_BINDING_ACTION } from "./constants.js"
import {
  buildSelectTemplateCardPayload,
  buildSelectTemplateCardResponse,
} from "./card.js"

interface CardActionEvent {
  operator?: { open_id?: string }
  action?: {
    value?: string | { action?: string }
  }
}

function readAction(action: CardActionEvent["action"]): string | undefined {
  const raw = action?.value
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as { action?: string }
      if (typeof parsed.action === "string") return parsed.action
    } catch {
      return raw
    }
    return raw
  }
  if (raw && typeof raw === "object") return raw.action
  return undefined
}

export function makeAccountBindingCardActionHandler(im: FeishuIM): CardActionHandler {
  return async function handle(envelope: DecryptedEnvelope) {
    const ev = envelope.event as CardActionEvent
    const action = readAction(ev.action)
    const operatorOpenId = ev.operator?.open_id

    logger.info(
      { openId: operatorOpenId, action, rawValue: ev.action?.value },
      "accountBinding.cardAction.received",
    )

    if (action !== START_BINDING_ACTION) return null
    if (!operatorOpenId) {
      logger.warn({ action }, "accountBinding.cardAction.missing_open_id")
      return { toast: { type: "error", content: "无法识别操作人，请重试" } }
    }

    try {
      await im.sendCardToUser(operatorOpenId, buildSelectTemplateCardPayload())
      logger.info({ openId: operatorOpenId }, "accountBinding.cardAction.template_sent")
    } catch (err) {
      logger.error({ err, openId: operatorOpenId }, "accountBinding.cardAction.template_failed")
      return {
        toast: {
          type: "error",
          content: "打开绑定表单失败，请确认应用已授权该卡片模板",
        },
      }
    }

    return buildSelectTemplateCardResponse()
  }
}
