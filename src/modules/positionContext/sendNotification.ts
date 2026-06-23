import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import { DEMO_NOTIFICATION_OPEN_ID } from "./constants.js"
import { buildCustomNotificationCard } from "./notificationCards.js"
import { normalizeOpenIds } from "./triggerClarification.js"

export function resolveNotificationOpenId(body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>
    if (typeof record.openId === "string" && record.openId.trim()) {
      return record.openId.trim()
    }
    const fromList = normalizeOpenIds(record.openIds)
    if (fromList.length > 0) return fromList[0]
  }
  return DEMO_NOTIFICATION_OPEN_ID
}

export function resolveNotificationOpenIds(body: unknown): string[] {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>
    if (typeof record.openId === "string" && record.openId.trim()) {
      return [record.openId.trim()]
    }
    const fromList = normalizeOpenIds(record.openIds)
    if (fromList.length > 0) return fromList
  }
  return [DEMO_NOTIFICATION_OPEN_ID]
}

export class SendNotificationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message)
    this.name = "SendNotificationError"
  }
}

export interface SendNotificationResult {
  openId: string
}

export async function sendNotificationCard(
  im: FeishuIM,
  card: unknown,
  openId: string = DEMO_NOTIFICATION_OPEN_ID,
): Promise<SendNotificationResult> {
  const targetOpenId = openId.trim()
  if (!targetOpenId) {
    throw new SendNotificationError("openId 不能为空")
  }

  try {
    await im.sendCardToUser(targetOpenId, card)
    logger.info({ openId: targetOpenId }, "positionContext.notification.sent")
    return { openId: targetOpenId }
  } catch (err) {
    logger.error({ err, openId: targetOpenId }, "positionContext.notification.failed")
    throw err
  }
}

export async function sendCustomNotification(
  im: FeishuIM,
  params: { title: string; content: string },
  openId: string = DEMO_NOTIFICATION_OPEN_ID,
): Promise<SendNotificationResult> {
  const title = params.title.trim()
  const content = params.content.trim()

  if (!title) throw new SendNotificationError("title 不能为空")
  if (!content) throw new SendNotificationError("content 不能为空")

  return sendNotificationCard(im, buildCustomNotificationCard(title, content), openId)
}