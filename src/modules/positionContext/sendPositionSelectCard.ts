import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { buildPositionSelectCard } from "./card.js"
import { MOCK_POSITIONS } from "./mockPositions.js"
import { positionContextStore } from "./store.js"

export async function sendPositionSelectCard(im: FeishuIM, operatorOpenId: string): Promise<void> {
  const currentId = positionContextStore.getCurrentPositionId(operatorOpenId)
  logger.info({ openId: operatorOpenId, currentId }, "positionContext.select_card.sending")
  await im.sendCardToUser(operatorOpenId, buildPositionSelectCard(MOCK_POSITIONS, currentId))
}
