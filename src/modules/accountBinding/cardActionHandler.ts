import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { CardActionHandler } from "../../webhook/cardAction.js"
import { logger } from "../../utils/logger.js"
import { START_BINDING_ACTION } from "./constants.js"
import { buildSelectTemplateCardResponse } from "./card.js"

interface CardActionEvent {
  operator?: { open_id?: string }
  action?: {
    value?: string | { action?: string }
  }
}

function readAction(value: CardActionEvent["action"]): string | undefined {
  const raw = value?.value
  if (typeof raw === "string") return raw
  if (raw && typeof raw === "object") return raw.action
  return undefined
}

export function makeAccountBindingCardActionHandler(): CardActionHandler {
  return async function handle(envelope: DecryptedEnvelope) {
    const ev = envelope.event as CardActionEvent
    const action = readAction(ev.action)
    const operatorOpenId = ev.operator?.open_id

    if (action !== START_BINDING_ACTION) return null

    logger.info({ openId: operatorOpenId, action }, "accountBinding.cardAction.start")

    return buildSelectTemplateCardResponse()
  }
}
