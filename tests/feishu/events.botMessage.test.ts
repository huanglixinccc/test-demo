import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeBotMessageHandler } from "../../src/feishu/events/botMessage.js"
import { BIND_ACCOUNT_AND_SYNC_POSITIONS_TEXT } from "../../src/modules/accountBinding/constants.js"
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

  it("triggers bind account and sync positions on keyword text", async () => {
    const im = fakeIm()
    const onBindAccountAndSyncPositions = vi.fn().mockResolvedValue(undefined)
    const handler = makeBotMessageHandler(im, { onBindAccountAndSyncPositions })

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_bind_sync",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: BIND_ACCOUNT_AND_SYNC_POSITIONS_TEXT }),
      },
    }))

    expect(onBindAccountAndSyncPositions).toHaveBeenCalledWith("ou_1")
    expect(im.sendTextToUser).not.toHaveBeenCalled()
  })

  it("ignores other p2p text without reply", async () => {
    const im = fakeIm()
    const onBindAccountAndSyncPositions = vi.fn().mockResolvedValue(undefined)
    const handler = makeBotMessageHandler(im, { onBindAccountAndSyncPositions })
    const got = vi.fn()
    bus.on("ResumeReceived", got)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_other",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "随便聊聊" }),
      },
    }))

    await new Promise((r) => setImmediate(r))
    expect(onBindAccountAndSyncPositions).not.toHaveBeenCalled()
    expect(im.sendTextToUser).not.toHaveBeenCalled()
    expect(got).not.toHaveBeenCalled()
  })

  it("ignores group messages", async () => {
    const im = fakeIm()
    const onBindAccountAndSyncPositions = vi.fn().mockResolvedValue(undefined)
    const handler = makeBotMessageHandler(im, { onBindAccountAndSyncPositions })

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_1",
        chat_type: "group",
        message_type: "text",
        content: JSON.stringify({ text: BIND_ACCOUNT_AND_SYNC_POSITIONS_TEXT }),
      },
    }))

    expect(onBindAccountAndSyncPositions).not.toHaveBeenCalled()
  })

  // it("emits ResumeReceived on p2p text", async () => {
  //   const im = fakeIm()
  //   const handler = makeBotMessageHandler(im)
  //   const got = vi.fn()
  //   bus.on("ResumeReceived", got)
  //
  //   await handler(envelope({
  //     sender: { sender_id: { open_id: "ou_1" } },
  //     message: {
  //       message_id: "om_1",
  //       chat_type: "p2p",
  //       message_type: "text",
  //       content: JSON.stringify({ text: "  张三  " }),
  //     },
  //   }))
  //
  //   await new Promise((r) => setImmediate(r))
  //   expect(im.sendTextToUser).toHaveBeenCalledWith("ou_1", "已收到，正在解析…")
  //   expect(got).toHaveBeenCalledWith(
  //     expect.objectContaining({ text: "张三", senderOpenId: "ou_1" }),
  //   )
  // })

  // it("routes 内推-prefixed text to ReferralReceived", async () => {
  //   ...
  // })

  // it("does not route a long paragraph that merely mentions 内推 to ReferralReceived", async () => {
  //   ...
  // })

  // it("ignores duplicate delivery of the same message_id", async () => {
  //   ...
  // })

  // it("routes analytics intent to AnalyticsQueryReceived", async () => {
  //   ...
  // })

  // it("downloads and emits for TXT file", async () => {
  //   ...
  // })
})
