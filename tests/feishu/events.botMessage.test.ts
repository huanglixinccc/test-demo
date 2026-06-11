import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeBotMessageHandler } from "../../src/feishu/events/botMessage.js"
import { bus } from "../../src/events/bus.js"
import type { FeishuIM } from "../../src/feishu/im.js"

function envelope(event: unknown) {
  return {
    schema: "2.0",
    header: {
      event_id: "e1",
      event_type: "im.message.receive_v1",
      create_time: "x",
      token: "t",
      app_id: "a",
      tenant_key: "t",
    },
    event,
  }
}

function fakeIm(): FeishuIM {
  return {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    downloadMessageFile: vi.fn().mockResolvedValue(Buffer.from("张三 138 react", "utf8")),
  } as unknown as FeishuIM
}

describe("bot message handler", () => {
  beforeEach(() => bus._resetForTesting())

  it("emits ResumeReceived on p2p text", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)
    const got = vi.fn()
    bus.on("ResumeReceived", got)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_1",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "  张三  " }),
      },
    }))

    await new Promise((r) => setImmediate(r))
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_1", "已收到，正在解析…")
    expect(got).toHaveBeenCalledWith(
      expect.objectContaining({ text: "张三", senderOpenId: "ou_1" }),
    )
  })

  it("ignores group messages", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)
    const got = vi.fn()
    bus.on("ResumeReceived", got)
    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_1",
        chat_type: "group",
        message_type: "text",
        content: JSON.stringify({ text: "hi" }),
      },
    }))
    await new Promise((r) => setImmediate(r))
    expect(got).not.toHaveBeenCalled()
  })

  it("downloads and emits for TXT file", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)
    const got = vi.fn()
    bus.on("ResumeReceived", got)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_2",
        chat_type: "p2p",
        message_type: "file",
        content: JSON.stringify({ file_key: "fk_1", file_name: "resume.txt" }),
      },
    }))

    await new Promise((r) => setImmediate(r))
    expect(im.downloadMessageFile).toHaveBeenCalledWith("om_2", "fk_1")
    expect(got).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "resume.txt" }),
    )
  })
})
