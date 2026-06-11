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

  it("routes 内推-prefixed text to ReferralReceived", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)
    const referral = vi.fn()
    const resume = vi.fn()
    bus.on("ReferralReceived", referral)
    bus.on("ResumeReceived", resume)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_ref" } },
      message: {
        message_id: "om_ref",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "内推 张三\n姓名:张三\n岗位:前端\n电话:138" }),
      },
    }))

    await new Promise((r) => setImmediate(r))
    expect(referral).toHaveBeenCalledWith(
      expect.objectContaining({ senderOpenId: "ou_ref" }),
    )
    expect(resume).not.toHaveBeenCalled()
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_ref", "已收到您的内推，正在解析…")
  })

  it("does not route a long paragraph that merely mentions 内推 to ReferralReceived", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)
    const referral = vi.fn()
    const resume = vi.fn()
    bus.on("ReferralReceived", referral)
    bus.on("ResumeReceived", resume)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_x" } },
      message: {
        message_id: "om_x",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({
          text:
            "我有一份简历想分享给你看看，内推机会很重要，但目前还在评估中，看你怎么决定。",
        }),
      },
    }))

    await new Promise((r) => setImmediate(r))
    expect(referral).not.toHaveBeenCalled()
    expect(resume).toHaveBeenCalled()
  })

  it("ignores duplicate delivery of the same message_id", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)
    const got = vi.fn()
    bus.on("ReferralReceived", got)

    const event = envelope({
      sender: { sender_id: { open_id: "ou_ref" } },
      message: {
        message_id: "om_dup",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "内推 王五\n姓名:王五\n岗位:后端" }),
      },
    })

    await handler(event)
    await handler(event)
    await new Promise((r) => setImmediate(r))

    expect(got).toHaveBeenCalledTimes(1)
    expect(im.sendTextToUser).toHaveBeenCalledTimes(1)
  })

  it("routes analytics intent to AnalyticsQueryReceived", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)
    const analytics = vi.fn()
    const resume = vi.fn()
    bus.on("AnalyticsQueryReceived", analytics)
    bus.on("ResumeReceived", resume)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_hr" } },
      message: {
        message_id: "om_analytics",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "本月前端岗位漏斗情况" }),
      },
    }))

    await new Promise((r) => setImmediate(r))
    expect(analytics).toHaveBeenCalledWith(
      expect.objectContaining({ senderOpenId: "ou_hr", text: "本月前端岗位漏斗情况" }),
    )
    expect(resume).not.toHaveBeenCalled()
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_hr", "正在统计招聘漏斗…")
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
