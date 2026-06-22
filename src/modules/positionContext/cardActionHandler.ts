import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { SELECT_POSITION_ACTION } from "./constants.js"
import {
  buildPositionAlreadyCurrentResponse,
  buildPositionSelectCard,
  buildPositionSelectedResponse,
} from "./card.js"
import { MOCK_POSITIONS, findMockPosition } from "./mockPositions.js"
import { positionContextStore } from "./store.js"

interface CardActionEvent {
  operator?: { open_id?: string }
  action?: { value?: unknown }
}

function readSelectPosition(value: unknown): { action?: string; positionId?: string } | null {
  if (value == null) return null
  if (typeof value === "string") {
    try {
      return readSelectPosition(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (typeof value !== "object") return null
  const record = value as { action?: unknown; positionId?: unknown }
  return {
    action: typeof record.action === "string" ? record.action : undefined,
    positionId: typeof record.positionId === "string" ? record.positionId : undefined,
  }
}

export function makePositionSelectCardActionHandler(im: FeishuIM): CardActionHandler {
  return async function handle(envelope: DecryptedEnvelope) {
    const ev = envelope.event as CardActionEvent
    const operatorOpenId = ev.operator?.open_id
    const parsed = readSelectPosition(ev.action?.value)

    if (parsed?.action !== SELECT_POSITION_ACTION || !parsed.positionId) return null

    const position = findMockPosition(parsed.positionId)
    if (!position) {
      logger.warn({ positionId: parsed.positionId }, "positionContext.select.unknown_position")
      return { toast: { type: "error", content: "职位不存在，请重新打开列表" } }
    }

    const currentId = positionContextStore.getCurrentPositionId(operatorOpenId ?? "")
    if (currentId === position.id) {
      logger.info({ openId: operatorOpenId, positionId: position.id }, "positionContext.select.already_current")
      return buildPositionAlreadyCurrentResponse(position)
    }

    if (!operatorOpenId) {
      return { toast: { type: "error", content: "无法识别操作人，请重试" } }
    }

    positionContextStore.setCurrentPosition(operatorOpenId, position.id)

    logger.info(
      {
        openId: operatorOpenId,
        positionId: position.id,
        positionName: position.name,
        address: position.address,
        enabled: position.enabled,
        accountBound: position.accountBound,
      },
      "positionContext.selected",
    )

    try {
      await im.sendCardToUser(
        operatorOpenId,
        buildPositionSelectCard(MOCK_POSITIONS, position.id),
      )
    } catch (err) {
      logger.error({ err, openId: operatorOpenId }, "positionContext.select.refresh_card_failed")
    }

    return buildPositionSelectedResponse(position)
  }
}
