import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { BIND_ACCOUNT_EVENT_KEY } from "./constants.js"
import { buildBindingCard } from "./card.js"

interface BotMenuEvent {
  event_key: string
  operator?: {
    operator_name?: string
    operator_id?: { open_id?: string }
  }
  timestamp?: number
}

export function makeAccountBindingMenuHandler(im: FeishuIM) {
  return async function handle(envelope: DecryptedEnvelope): Promise<void> {
    const ev = envelope.event as BotMenuEvent
    const eventKey = ev?.event_key
    const operatorOpenId = ev?.operator?.operator_id?.open_id

    if (!eventKey || !operatorOpenId) {
      logger.warn({ eventKey, operatorOpenId }, "accountBinding.missing_fields")
      return
    }

    logger.info(
      { openId: operatorOpenId, eventKey, operatorName: ev.operator?.operator_name },
      "accountBinding.menu.received",
    )

    if (eventKey !== BIND_ACCOUNT_EVENT_KEY) {
      logger.info({ eventKey }, "accountBinding.menu.ignored")
      return
    }

    await im.sendCardToUser(operatorOpenId, buildBindingCard())
  }
}
