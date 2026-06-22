import type { FeishuIM } from "../../feishu/im.js"
import { buildLinkPositionCard } from "./linkPositionCard.js"

export async function sendPositionSelectCard(im: FeishuIM, operatorOpenId: string): Promise<void> {
  await im.sendCardToUser(operatorOpenId, buildLinkPositionCard())
}
