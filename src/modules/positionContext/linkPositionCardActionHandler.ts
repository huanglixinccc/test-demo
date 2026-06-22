import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import {
  LINK_POSITION_CONFIRM_ACTION,
  LINK_POSITION_SELECT_ACTION,
  START_CLARIFICATION_ACTION,
} from "./constants.js"
import {
  buildClarificationCard,
  buildLinkPositionCardUpdate,
  type LinkPositionCardState,
} from "./linkPositionCard.js"
import {
  findPlatformPosition,
  findRecruitmentPlatform,
  isPositionFullyLinked,
} from "./mockPlatforms.js"

interface CardActionEvent {
  operator?: { open_id?: string }
  action?: {
    tag?: string
    option?: string
    value?: unknown
    form_value?: unknown
  }
}

function readActionValue(value: unknown): Record<string, unknown> | null {
  if (value == null) return null
  if (typeof value === "string") {
    try {
      return readActionValue(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (typeof value !== "object") return null
  return value as Record<string, unknown>
}

function readAction(event: CardActionEvent) {
  const record = readActionValue(event.action?.value)
  if (!record) return null
  return {
    action: typeof record.action === "string" ? record.action : undefined,
    platformId: typeof record.platformId === "string" ? record.platformId : undefined,
    positionId: typeof record.positionId === "string" ? record.positionId : undefined,
    field: typeof record.field === "string" ? record.field : undefined,
  }
}

async function sendClarificationCard(
  im: FeishuIM,
  openId: string,
  positionName: string,
): Promise<void> {
  await im.sendCardToUser(openId, buildClarificationCard(positionName))
}

export function makeLinkPositionCardActionHandler(im: FeishuIM): CardActionHandler {
  return async function handle(envelope: DecryptedEnvelope) {
    const ev = envelope.event as CardActionEvent
    const operatorOpenId = ev.operator?.open_id
    const parsed = readAction(ev)

    if (parsed?.action === START_CLARIFICATION_ACTION) {
      return {
        toast: { type: "info", content: "即将开始职位澄清" },
      }
    }

    if (parsed?.action === LINK_POSITION_SELECT_ACTION && parsed.field !== "link_platforms") {
      if (!parsed.platformId) return null

      const platform = findRecruitmentPlatform(parsed.platformId)
      const positionId = ev.action?.option
      if (!platform || !positionId) return null

      const position = findPlatformPosition(positionId)
      if (!position) {
        return { toast: { type: "error", content: "职位不存在，请重新选择" } }
      }

      logger.info(
        {
          openId: operatorOpenId,
          platformId: platform.id,
          platformName: platform.name,
          positionId: position.id,
          positionName: position.name,
          allPlatformsLinked: position.allPlatformsLinked,
        },
        "positionContext.link_position.selected",
      )

      if (isPositionFullyLinked(position.id)) {
        if (operatorOpenId) {
          try {
            await sendClarificationCard(im, operatorOpenId, position.name)
          } catch (err) {
            logger.error({ err, openId: operatorOpenId }, "positionContext.clarification.send_failed")
            return { toast: { type: "error", content: "发送澄清消息失败，请稍后重试" } }
          }
        }
        return { toast: { type: "success", content: `已发送【${position.name}】澄清消息` } }
      }

      const nextState: LinkPositionCardState = {
        expandedPlatformId: platform.id,
        pendingPositionId: position.id,
      }
      return buildLinkPositionCardUpdate(nextState)
    }

    if (parsed?.action === LINK_POSITION_CONFIRM_ACTION) {
      if (!parsed.platformId || !parsed.positionId) {
        return { toast: { type: "warning", content: "请先选择职位并勾选需要关联的平台" } }
      }

      const platform = findRecruitmentPlatform(parsed.platformId)
      const position = findPlatformPosition(parsed.positionId)
      if (!platform || !position) {
        return { toast: { type: "error", content: "选择无效，请重新操作" } }
      }
      if (isPositionFullyLinked(position.id)) {
        return { toast: { type: "info", content: "该职位已关联全部平台，请直接选择职位" } }
      }

      if (!operatorOpenId) {
        return { toast: { type: "error", content: "无法识别操作人，请重试" } }
      }

      logger.info(
        {
          openId: operatorOpenId,
          platformId: platform.id,
          positionId: position.id,
          formValue: ev.action?.form_value,
        },
        "positionContext.link_position.confirmed",
      )

      try {
        await sendClarificationCard(im, operatorOpenId, position.name)
      } catch (err) {
        logger.error({ err, openId: operatorOpenId }, "positionContext.clarification.send_failed")
        return { toast: { type: "error", content: "发送澄清消息失败，请稍后重试" } }
      }

      return { toast: { type: "success", content: `已发送【${position.name}】澄清消息` } }
    }

    return null
  }
}
