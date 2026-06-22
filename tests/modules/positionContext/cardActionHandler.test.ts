import { describe, it, expect, vi, beforeEach } from "vitest"
import { makePositionSelectCardActionHandler } from "../../../src/modules/positionContext/cardActionHandler.js"
import { SELECT_POSITION_ACTION } from "../../../src/modules/positionContext/constants.js"
import { positionContextStore } from "../../../src/modules/positionContext/store.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

function envelope(event: unknown) {
  return {
    schema: "2.0",
    header: {
      event_id: "e_card_1",
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

describe("position select card action handler", () => {
  beforeEach(() => {
    positionContextStore.clearForTesting()
  })

  it("sends clarification directly for platform-linked workspace position", async () => {
    const im = fakeIm()
    const handler = makePositionSelectCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        value: { action: SELECT_POSITION_ACTION, positionId: "pos_fe" },
      },
    }))

    expect(positionContextStore.getCurrentPositionId("ou_hr")).toBe("pos_fe")
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "您有一个新职位【前端工程师】待澄清" }),
        }),
      }),
    )
    expect(response).toEqual({
      toast: { type: "success", content: "已发送【前端工程师】澄清消息" },
    })
  })

  it("sends link position card for unlinked workspace position", async () => {
    const im = fakeIm()
    const handler = makePositionSelectCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        value: { action: SELECT_POSITION_ACTION, positionId: "pos_be" },
      },
    }))

    expect(positionContextStore.getCurrentPositionId("ou_hr")).toBe("pos_be")
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "关联职位" }),
        }),
      }),
    )
    expect(response).toEqual({
      toast: { type: "info", content: "请完成平台关联后点击确认" },
    })
  })

  it("returns null for unrelated card actions", async () => {
    const im = fakeIm()
    const handler = makePositionSelectCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: { value: { action: "other" } },
    }))

    expect(response).toBeNull()
  })
})
