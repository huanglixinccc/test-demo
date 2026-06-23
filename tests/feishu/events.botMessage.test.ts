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

  it("sends recruitment data card when message contains 寻聘数据", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_data",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "帮我看一下寻聘数据" }),
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "【HRBP】今日寻聘数据" }),
        }),
      }),
    )
  })

  it("sends clarification card when message contains 开始澄清 or 职位澄清", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_clarification",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "开始澄清" }),
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({
            content: "您有一个新职位【HRBP】待澄清",
          }),
        }),
      }),
    )
  })

  it("sends strategy template suggestion card when message contains 修改建议", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_suggestion",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "给我修改建议" }),
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({
            content: "【安卓高级开发工程师】配置修改建议已生成",
          }),
        }),
      }),
    )
  })

  it("sends task closed card when message contains 结束/暂停/关闭/停止", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_task_closed",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "结束寻聘任务" }),
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "【HRBP】寻聘任务已关闭" }),
        }),
      }),
    )
  })

  it("sends manual rejection card when message contains 人工淘汰", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_manual_rejection",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "帮我看人工淘汰" }),
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({
            content: "【机器学习平台研发工程师】人工淘汰理由分析",
          }),
        }),
      }),
    )
  })

  it("sends rejection reason card when message contains 淘汰理由 or 淘汰", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_rejection",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "帮我分析淘汰理由" }),
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "【HRBP】淘汰理由分析" }),
        }),
      }),
    )
  })

  it("sends search strategy card when message contains 寻访策略 or 策略模板", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_strategy",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "给我策略模板" }),
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            text: expect.objectContaining({
              content: expect.stringContaining("**寻访任务：**"),
            }),
          }),
        ]),
      }),
    )
  })

  it("sends start recruitment task card when message contains 开始/继续/开启", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_start_task",
        chat_type: "p2p",
        message_type: "text",
        content: JSON.stringify({ text: "开启寻聘" }),
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          template: "green",
          title: expect.objectContaining({ content: "开启成功" }),
        }),
        elements: expect.arrayContaining([
          expect.objectContaining({
            text: expect.objectContaining({ content: "开始执行寻访任务" }),
          }),
        ]),
      }),
    )
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
    expect(im.sendCardToUser).not.toHaveBeenCalled()
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
