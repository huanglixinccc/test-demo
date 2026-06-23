import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { buildRecruitmentStrategyCard } from "./linkPositionCard.js"
import { normalizeOpenIds } from "./triggerClarification.js"

export class TriggerRecruitmentStrategyError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message)
    this.name = "TriggerRecruitmentStrategyError"
  }
}

export interface TriggerRecruitmentStrategyParams {
  positionName: string
  openIds: string[]
}

export interface TriggerRecruitmentStrategyResult {
  positionName: string
  sent: string[]
  failed: Array<{ openId: string; error: string }>
}

/** 手动触发寻聘策略卡片：向指定飞书用户发送寻聘策略已生成卡片 */
export async function triggerRecruitmentStrategy(
  im: FeishuIM,
  params: TriggerRecruitmentStrategyParams,
): Promise<TriggerRecruitmentStrategyResult> {
  const positionName = params.positionName.trim()
  if (!positionName) {
    throw new TriggerRecruitmentStrategyError("positionName 不能为空")
  }

  const openIds = normalizeOpenIds(params.openIds)
  if (openIds.length === 0) {
    throw new TriggerRecruitmentStrategyError("openIds 不能为空")
  }

  const card = buildRecruitmentStrategyCard(positionName)
  const sent: string[] = []
  const failed: Array<{ openId: string; error: string }> = []

  for (const openId of openIds) {
    try {
      await im.sendCardToUser(openId, card)
      sent.push(openId)
      logger.info({ openId, positionName }, "positionContext.manual_recruitment_strategy.sent")
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      failed.push({ openId, error })
      logger.error(
        { err, openId, positionName },
        "positionContext.manual_recruitment_strategy.failed",
      )
    }
  }

  return { positionName, sent, failed }
}
