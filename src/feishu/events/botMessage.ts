import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { FeishuIM } from "../im.js"
import { bus } from "../../events/bus.js"
import { logger } from "../../utils/logger.js"
import { extractTextFromPdf } from "../../utils/pdf.js"

interface ImMessageEvent {
  sender: { sender_id: { open_id: string } }
  message: {
    message_id: string
    chat_type: "p2p" | "group"
    message_type: "text" | "file" | "post" | string
    content: string
  }
}

export function makeBotMessageHandler(im: FeishuIM) {
  return async function handle(envelope: DecryptedEnvelope): Promise<void> {
    const ev = envelope.event as ImMessageEvent
    if (ev?.message?.chat_type !== "p2p") return
    const senderOpenId = ev.sender?.sender_id?.open_id
    if (!senderOpenId) return

    logger.info(
      { openId: senderOpenId, type: ev.message.message_type, messageId: ev.message.message_id },
      "botMessage.received",
    )

    if (ev.message.message_type === "text") {
      const text = safeParseText(ev.message.content)
      if (!text) return
      await im.sendTextToUser(senderOpenId, "已收到，正在解析…")
      bus.emit("ResumeReceived", {
        text,
        senderOpenId,
        sourceMessageId: ev.message.message_id,
      })
      return
    }

    if (ev.message.message_type === "file") {
      const fileMeta = safeParseFile(ev.message.content)
      if (!fileMeta?.file_key) {
        await im.sendTextToUser(senderOpenId, "未能识别该文件")
        return
      }
      await im.sendTextToUser(senderOpenId, "已收到文件，正在提取文本…")
      try {
        const buf = await im.downloadMessageFile(ev.message.message_id, fileMeta.file_key)
        const text = await extractText(buf, fileMeta.file_name ?? "")
        if (!text) {
          await im.sendTextToUser(
            senderOpenId,
            "文件中没有提取到文字（可能是扫描件）。请粘贴简历文本。",
          )
          return
        }
        bus.emit("ResumeReceived", {
          text,
          senderOpenId,
          sourceMessageId: ev.message.message_id,
          filename: fileMeta.file_name,
        })
      } catch (err) {
        logger.error({ err }, "botMessage.file.extract_failed")
        await im.sendTextToUser(senderOpenId, "文件提取失败，请改用文本粘贴")
      }
      return
    }

    logger.info({ type: ev.message.message_type }, "botMessage.unsupported_type")
  }
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
