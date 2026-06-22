import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeLinkPositionCardActionHandler } from "../../../src/modules/positionContext/linkPositionCardActionHandler.js"
import {
  LINK_POSITION_CONFIRM_ACTION,
  LINK_POSITION_SELECT_ACTION,
  START_CLARIFICATION_ACTION,
} from "../../../src/modules/positionContext/constants.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

function envelope(event: unknown) {
  return {
    schema: "2.0",
    header: {
      event_id: "e_link_1",
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

describe("link position card action handler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns demo toast on platform position select without sending cards", async () => {
    const im = fakeIm()
    const handler = makeLinkPositionCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "select_static",
        option: "pos_fe",
        value: {
          action: LINK_POSITION_SELECT_ACTION,
          platformId: "platform_boss",
          field: "platform_position",
        },
      },
    }))

    expect(im.sendCardToUser).not.toHaveBeenCalled()
    expect(response).toEqual({ toast: { type: "info", content: "已选择（演示）" } })
  })

  it("sends clarification card on confirm", async () => {
    const im = fakeIm()
    const handler = makeLinkPositionCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "button",
        value: {
          action: LINK_POSITION_CONFIRM_ACTION,
          positionId: "pos_be",
          positionName: "后端工程师",
        },
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "您有一个新职位【后端工程师】待澄清" }),
        }),
      }),
    )
    expect(response).toEqual({
      toast: { type: "success", content: "已发送【后端工程师】澄清消息" },
    })
  })

  it("returns info toast for start clarification button", async () => {
    const im = fakeIm()
    const handler = makeLinkPositionCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "button",
        value: { action: START_CLARIFICATION_ACTION },
      },
    }))

    expect(response).toEqual({
      toast: { type: "info", content: "即将开始职位澄清" },
    })
  })
})
