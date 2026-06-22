import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { SELECT_POSITIONS_EVENT_KEY } from "./constants.js"
import { sendPositionSelectCard } from "./sendPositionSelectCard.js"

interface BotMenuEvent {
  event_key: string
  operator?: {
    operator_name?: string
    operator_id?: { open_id?: string }
  }
}

export function makePositionSelectMenuHandler(im: FeishuIM) {
  return async function handle(envelope: DecryptedEnvelope): Promise<void> {
    const ev = envelope.event as BotMenuEvent
    const eventKey = ev?.event_key
    const operatorOpenId = ev?.operator?.operator_id?.open_id

    if (eventKey !== SELECT_POSITIONS_EVENT_KEY) return
    if (!operatorOpenId) {
      logger.warn({ eventKey }, "positionContext.menu.missing_open_id")
      return
    }

    logger.info(
      { openId: operatorOpenId, eventKey, operatorName: ev.operator?.operator_name },
      "positionContext.menu.received",
    )

    await sendPositionSelectCard(im, operatorOpenId)
  }
}
