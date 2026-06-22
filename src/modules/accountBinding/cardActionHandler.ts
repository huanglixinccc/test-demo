import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { START_BINDING_ACTION } from "./constants.js"
import {
  BINDING_SUCCESS_MESSAGE,
  buildBindingSuccessResponse,
  buildSelectTemplateCardPayload,
  buildSelectTemplateCardResponse,
} from "./card.js"
import { parseCardSubmitPayload } from "./submitData.js"

interface CardActionEvent {
  operator?: { open_id?: string }
  action?: {
    value?: unknown
    form_value?: unknown
  }
}

function readStartAction(value: unknown): string | undefined {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as { action?: string }
      if (typeof parsed.action === "string") return parsed.action
    } catch {
      return value
    }
    return value
  }
  if (value && typeof value === "object" && "action" in value) {
    const action = (value as { action?: unknown }).action
    return typeof action === "string" ? action : undefined
  }
  return undefined
}

async function handleSubmit(
  im: FeishuIM,
  operatorOpenId: string | undefined,
  submitPayload: ReturnType<typeof parseCardSubmitPayload>,
): Promise<Record<string, unknown>> {
  logger.info(
    { openId: operatorOpenId, result: submitPayload },
    "accountBinding.submit.received",
  )

  if (operatorOpenId) {
    try {
      await im.sendTextToUser(operatorOpenId, BINDING_SUCCESS_MESSAGE)
    } catch (err) {
      logger.error({ err, openId: operatorOpenId }, "accountBinding.submit.notify_failed")
    }
  }

  return buildBindingSuccessResponse()
}

export function makeAccountBindingCardActionHandler(im: FeishuIM): CardActionHandler {
  return async function handle(envelope: DecryptedEnvelope) {
    const ev = envelope.event as CardActionEvent
    const operatorOpenId = ev.operator?.open_id
    const submitPayload =
      parseCardSubmitPayload(ev.action?.value) ?? parseCardSubmitPayload(ev.action?.form_value)

    if (submitPayload) {
      return handleSubmit(im, operatorOpenId, submitPayload)
    }

    const action = readStartAction(ev.action?.value)

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
