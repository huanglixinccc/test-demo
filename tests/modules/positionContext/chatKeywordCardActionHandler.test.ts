import { describe, it, expect, vi } from "vitest"
import { makeChatKeywordCardActionHandler } from "../../../src/modules/positionContext/chatKeywordCardActionHandler.js"
import { TASK_CLOSED_LINK_ACTION } from "../../../src/modules/positionContext/chatKeywordCards.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

function envelope(event: unknown) {
  return {
    schema: "2.0",
    header: {
      event_id: "e_kw_1",
      event_type: "card.action.trigger",
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
    downloadMessageFile: vi.fn(),
  } as unknown as FeishuIM
}

describe("chat keyword card action handler", () => {
  it("dispatches strategy suggestion card for 寻聘策略修改建议 link", async () => {
    const im = fakeIm()
    const handler = makeChatKeywordCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "button",
        value: {
          action: TASK_CLOSED_LINK_ACTION,
          message: "寻聘策略修改建议",
        },
      },
    }))

    expect(response).toBeNull()
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({
            content: "【安卓高级开发工程师】配置修改建议已生成",
          }),
        }),
      }),
    )
  })

  it("dispatches fixed message when task closed link is clicked", async () => {
    const im = fakeIm()
    const handler = makeChatKeywordCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "button",
        value: {
          action: TASK_CLOSED_LINK_ACTION,
          message: "寻聘数据",
        },
      },
    }))

    expect(response).toBeNull()
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "【HRBP】今日寻聘数据" }),
        }),
      }),
    )
  })

  it("ignores unrelated card actions", async () => {
    const im = fakeIm()
    const handler = makeChatKeywordCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "button",
        value: { action: "other_action" },
      },
    }))

    expect(response).toBeNull()
    expect(im.sendCardToUser).not.toHaveBeenCalled()
    expect(im.sendTextToUser).not.toHaveBeenCalled()
  })
})
