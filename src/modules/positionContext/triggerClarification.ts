import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { buildClarificationCard } from "./linkPositionCard.js"

export class TriggerClarificationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message)
    this.name = "TriggerClarificationError"
  }
}

export interface TriggerClarificationParams {
  positionName: string
  openIds: string[]
}

export interface TriggerClarificationResult {
  positionName: string
  sent: string[]
  failed: Array<{ openId: string; error: string }>
}

export function normalizeOpenIds(
  openIds: unknown,
  fallbackOpenIds: string[] = [],
): string[] {
  if (Array.isArray(openIds)) {
    return [...new Set(openIds.map((id) => String(id).trim()).filter(Boolean))]
  }
  if (typeof openIds === "string" && openIds.trim()) {
    return [openIds.trim()]
  }
  return [...new Set(fallbackOpenIds.map((id) => id.trim()).filter(Boolean))]
}

/** 手动触发职位澄清：向指定飞书用户发送澄清卡片 */
export async function triggerClarification(
  im: FeishuIM,
  params: TriggerClarificationParams,
): Promise<TriggerClarificationResult> {
  const positionName = params.positionName.trim()
  if (!positionName) {
    throw new TriggerClarificationError("positionName 不能为空")
  }

  const openIds = normalizeOpenIds(params.openIds)
  if (openIds.length === 0) {
    throw new TriggerClarificationError("openIds 不能为空")
  }

  const card = buildClarificationCard(positionName)
  const sent: string[] = []
  const failed: Array<{ openId: string; error: string }> = []

  for (const openId of openIds) {
    try {
      await im.sendCardToUser(openId, card)
      sent.push(openId)
      logger.info({ openId, positionName }, "positionContext.manual_clarification.sent")
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      failed.push({ openId, error })
      logger.error({ err, openId, positionName }, "positionContext.manual_clarification.failed")
    }
  }

  return { positionName, sent, failed }
}
