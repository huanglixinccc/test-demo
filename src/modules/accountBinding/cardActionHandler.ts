import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { START_BINDING_ACTION } from "./constants.js"
import {
  BINDING_SUCCESS_MESSAGE,
  buildBindingSelectCard,
  buildBindingSuccessResponse,
  buildSelectTemplateCardResponse,
} from "./card.js"
import { parseCardSubmitFromAction, parseCardSubmitFromEvent } from "./submitData.js"

interface CardActionEvent {
  operator?: { open_id?: string }
  action?: {
    value?: unknown
    form_value?: unknown
    tag?: string
    name?: string
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
  submitPayload: NonNullable<ReturnType<typeof parseCardSubmitFromEvent>>,
  afterBindingSuccess?: (openId: string) => Promise<void>,
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

    if (afterBindingSuccess) {
      try {
        await afterBindingSuccess(operatorOpenId)
        logger.info({ openId: operatorOpenId }, "accountBinding.submit.position_select_triggered")
      } catch (err) {
        logger.error({ err, openId: operatorOpenId }, "accountBinding.submit.position_select_failed")
      }
    }
  }

  return buildBindingSuccessResponse()
}

export function makeAccountBindingCardActionHandler(
  im: FeishuIM,
  options?: { afterBindingSuccess?: (openId: string) => Promise<void> },
): CardActionHandler {
  return async function handle(envelope: DecryptedEnvelope) {
    const ev = envelope.event as CardActionEvent
    const operatorOpenId = ev.operator?.open_id

    logger.info(
      { openId: operatorOpenId, action: ev.action },
      "accountBinding.cardAction.raw",
    )

    const submitPayload =
      parseCardSubmitFromAction(ev.action) ?? parseCardSubmitFromEvent(ev)

    if (submitPayload) {
      return handleSubmit(im, operatorOpenId, submitPayload, options?.afterBindingSuccess)
    }

    const action = readStartAction(ev.action?.value)

    logger.info(
      { openId: operatorOpenId, action, rawValue: ev.action?.value, tag: ev.action?.tag },
      "accountBinding.cardAction.received",
    )

    if (action !== START_BINDING_ACTION) {
      logger.info(
        { openId: operatorOpenId, tag: ev.action?.tag, name: ev.action?.name },
        "accountBinding.cardAction.ignored",
      )
      return null
    }
    if (!operatorOpenId) {
      logger.warn({ action }, "accountBinding.cardAction.missing_open_id")
      return { toast: { type: "error", content: "无法识别操作人，请重试" } }
    }

    try {
      await im.sendCardToUser(operatorOpenId, buildBindingSelectCard())
      logger.info({ openId: operatorOpenId }, "accountBinding.cardAction.form_sent")
    } catch (err) {
      logger.error({ err, openId: operatorOpenId }, "accountBinding.cardAction.form_failed")
      return {
        toast: {
          type: "error",
          content: "打开绑定表单失败，请稍后重试",
        },
      }
    }

    return buildSelectTemplateCardResponse()
  }
}
