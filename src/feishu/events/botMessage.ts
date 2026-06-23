import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { FeishuIM } from "../im.js"
import { bus } from "../../events/bus.js"
import { logger } from "../../utils/logger.js"
import { LruDedupe } from "../../utils/dedupe.js"
import { isAnalyticsIntent } from "../../agents/analytics/query.js"
import { extractTextFromPdf } from "../../utils/pdf.js"
import { BIND_ACCOUNT_AND_SYNC_POSITIONS_TEXT } from "../../modules/accountBinding/constants.js"
import { buildTaskClosedCard } from "../../modules/positionContext/chatKeywordCards.js"
import { dispatchChatKeywordReply } from "../../modules/positionContext/chatKeywordReply.js"
import {
  isClarificationIntent,
  isManualRejectionIntent,
  isRecruitmentDataIntent,
  isRejectionReasonIntent,
  isSearchStrategyIntent,
  isStartRecruitmentTaskIntent,
  isStrategyTemplateSuggestionIntent,
  isTaskClosedIntent,
} from "../../modules/positionContext/chatKeywordIntents.js"

interface ImMessageEvent {
  sender: { sender_id: { open_id: string } }
  message: {
    message_id: string
    chat_type: "p2p" | "group"
    message_type: "text" | "file" | "post" | string
    content: string
  }
}

const messageDedupe = new LruDedupe(2000)

export interface BotMessageHandlerOptions {
  onBindAccountAndSyncPositions?: (openId: string) => Promise<void>
}

export function makeBotMessageHandler(im: FeishuIM, options?: BotMessageHandlerOptions) {
  return async function handle(envelope: DecryptedEnvelope): Promise<void> {
    const ev = envelope.event as ImMessageEvent
    if (ev?.message?.chat_type !== "p2p") return
    const senderOpenId = ev.sender?.sender_id?.open_id
    if (!senderOpenId) return

    if (messageDedupe.seen(ev.message.message_id)) {
      logger.info({ messageId: ev.message.message_id }, "botMessage.dedupe.skip")
      return
    }

    if (ev.message.message_type === "text") {
      const text = safeParseText(ev.message.content)
      if (!text) return

      if (text === BIND_ACCOUNT_AND_SYNC_POSITIONS_TEXT) {
        if (options?.onBindAccountAndSyncPositions) {
          await options.onBindAccountAndSyncPositions(senderOpenId)
        }
        return
      }

      if (isRecruitmentDataIntent(text)) {
        logger.info({ openId: senderOpenId }, "botMessage.recruitment_data")
        await dispatchChatKeywordReply(im, senderOpenId, text)
        return
      }

      if (isSearchStrategyIntent(text)) {
        logger.info({ openId: senderOpenId }, "botMessage.search_strategy")
        await dispatchChatKeywordReply(im, senderOpenId, text)
        return
      }

      if (isStrategyTemplateSuggestionIntent(text)) {
        logger.info({ openId: senderOpenId }, "botMessage.strategy_template_suggestion")
        await dispatchChatKeywordReply(im, senderOpenId, text)
        return
      }

      if (isManualRejectionIntent(text)) {
        logger.info({ openId: senderOpenId }, "botMessage.manual_rejection_reason")
        await dispatchChatKeywordReply(im, senderOpenId, text)
        return
      }

      if (isRejectionReasonIntent(text)) {
        logger.info({ openId: senderOpenId }, "botMessage.rejection_reason")
        await dispatchChatKeywordReply(im, senderOpenId, text)
        return
      }

      if (isTaskClosedIntent(text)) {
        logger.info({ openId: senderOpenId }, "botMessage.task_closed")
        await im.sendCardToUser(senderOpenId, buildTaskClosedCard())
        return
      }

      if (isClarificationIntent(text)) {
        logger.info({ openId: senderOpenId }, "botMessage.clarification")
        await dispatchChatKeywordReply(im, senderOpenId, text)
        return
      }

      if (isStartRecruitmentTaskIntent(text)) {
        logger.info({ openId: senderOpenId }, "botMessage.start_recruitment_task")
        await dispatchChatKeywordReply(im, senderOpenId, text)
        return
      }

      return
    }

    // if (ev.message.message_type === "text") {
    //   const text = safeParseText(ev.message.content)
    //   if (!text) return
    //
    //   logger.info(
    //     { openId: senderOpenId, type: ev.message.message_type, messageId: ev.message.message_id },
    //     "botMessage.received",
    //   )
    //
    //   if (isReferralIntent(text)) {
    //     await im.sendTextToUser(senderOpenId, "已收到您的内推，正在解析…")
    //     bus.emit("ReferralReceived", {
    //       text,
    //       senderOpenId,
    //       sourceMessageId: ev.message.message_id,
    //     })
    //     return
    //   }
    //
    //   if (isAnalyticsIntent(text)) {
    //     await im.sendTextToUser(senderOpenId, "正在统计招聘漏斗…")
    //     bus.emit("AnalyticsQueryReceived", {
    //       text,
    //       senderOpenId,
    //       sourceMessageId: ev.message.message_id,
    //     })
    //     return
    //   }
    //
    //   await im.sendTextToUser(senderOpenId, "已收到，正在解析…")
    //   bus.emit("ResumeReceived", {
    //     text,
    //     senderOpenId,
    //     sourceMessageId: ev.message.message_id,
    //   })
    //   return
    // }
    //
    // if (ev.message.message_type === "file") {
    //   const fileMeta = safeParseFile(ev.message.content)
    //   if (!fileMeta?.file_key) {
    //     await im.sendTextToUser(senderOpenId, "未能识别该文件")
    //     return
    //   }
    //   await im.sendTextToUser(senderOpenId, "已收到文件，正在提取文本…")
    //   try {
    //     const buf = await im.downloadMessageFile(ev.message.message_id, fileMeta.file_key)
    //     const text = await extractText(buf, fileMeta.file_name ?? "")
    //     if (!text) {
    //       await im.sendTextToUser(
    //         senderOpenId,
    //         "文件中没有提取到文字（可能是扫描件）。请粘贴简历文本。",
    //       )
    //       return
    //     }
    //     bus.emit("ResumeReceived", {
    //       text,
    //       senderOpenId,
    //       sourceMessageId: ev.message.message_id,
    //       filename: fileMeta.file_name,
    //     })
    //   } catch (err) {
    //     logger.error({ err }, "botMessage.file.extract_failed")
    //     await im.sendTextToUser(senderOpenId, "文件提取失败，请改用文本粘贴")
    //   }
    //   return
    // }
    //
    // logger.info({ type: ev.message.message_type }, "botMessage.unsupported_type")
  }
}

// First non-empty line of the message body is the "intent line". If it contains
// 内推/推荐 (and is short enough to be a header, not a paragraph), treat the
// whole message as a referral submission.
export function isReferralIntent(text: string): boolean {
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) ?? ""
  if (firstLine.length === 0 || firstLine.length > 30) return false
  return /内推|推荐/.test(firstLine)
}

function safeParseText(content: string): string | undefined {
  try {
    const parsed = JSON.parse(content) as { text?: string }
    if (typeof parsed.text === "string") return parsed.text.trim()
  } catch {
    // fall through
  }
  return undefined
}

function safeParseFile(content: string): { file_key?: string; file_name?: string } | undefined {
  try {
    return JSON.parse(content)
  } catch {
    return undefined
  }
}

async function extractText(buf: Buffer, filename: string): Promise<string> {
  if (filename.toLowerCase().endsWith(".pdf")) {
    return extractTextFromPdf(buf)
  }
  return buf.toString("utf8").trim()
}
