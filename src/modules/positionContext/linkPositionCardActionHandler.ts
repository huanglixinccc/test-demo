import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import {
  LINK_POSITION_CONFIRM_ACTION,
  LINK_POSITION_SELECT_ACTION,
  START_CLARIFICATION_ACTION,
  START_RECRUITMENT_ACTION,
} from "./constants.js"
import { buildClarificationCard } from "./linkPositionCard.js"
import { findMockPosition } from "./mockPositions.js"

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
    positionName: typeof record.positionName === "string" ? record.positionName : undefined,
    field: typeof record.field === "string" ? record.field : undefined,
    mode: typeof record.mode === "string" ? record.mode : undefined,
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
      const positionName = parsed.positionName ?? "职位"
      logger.info(
        { openId: operatorOpenId, positionName },
        "positionContext.clarification.started",
      )
      return { toast: { type: "info", content: "正在打开澄清页面" } }
    }

    if (parsed?.action === START_RECRUITMENT_ACTION) {
      logger.info(
        {
          openId: operatorOpenId,
          positionName: parsed.positionName,
          mode: parsed.mode,
        },
        "positionContext.recruitment.started",
      )
      return { toast: { type: "success", content: "任务已启动" } }
    }

    if (parsed?.action === LINK_POSITION_SELECT_ACTION) {
      logger.info(
        {
          openId: operatorOpenId,
          platformId: parsed.platformId,
          field: parsed.field,
          option: ev.action?.option,
        },
        "positionContext.link_position.demo_select",
      )
      return { toast: { type: "info", content: "已选择" } }
    }

    if (parsed?.action === LINK_POSITION_CONFIRM_ACTION) {
      const positionName = parsed.positionName
      if (!positionName || !operatorOpenId) {
        return { toast: { type: "error", content: "无法识别职位，请重新选择工作区职位" } }
      }

      const position = parsed.positionId ? findMockPosition(parsed.positionId) : undefined

      logger.info(
        {
          openId: operatorOpenId,
          positionId: parsed.positionId,
          positionName,
          clarified: position?.clarified,
          formValue: ev.action?.form_value,
        },
        "positionContext.link_position.confirmed",
      )

      if (position?.clarified) {
        return { toast: { type: "info", content: `【${positionName}】已完成澄清，无需重复发送` } }
      }

      try {
        await sendClarificationCard(im, operatorOpenId, positionName)
      } catch (err) {
        logger.error({ err, openId: operatorOpenId }, "positionContext.clarification.send_failed")
        return { toast: { type: "error", content: "发送澄清消息失败，请稍后重试" } }
      }

      return { toast: { type: "success", content: `已发送【${positionName}】澄清消息` } }
    }

    return null
  }
}
