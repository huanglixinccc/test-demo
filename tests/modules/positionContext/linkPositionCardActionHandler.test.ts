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

  it("sends clarification immediately when selecting fully linked first position on any platform", async () => {
    const im = fakeIm()
    const handler = makeLinkPositionCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "select_static",
        option: "pos_hrbp",
        value: {
          action: LINK_POSITION_SELECT_ACTION,
          platformId: "platform_liepin",
        },
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "您有一个新职位【HRBP】待澄清" }),
        }),
      }),
    )
    expect(response).toEqual({
      toast: { type: "success", content: "已发送【HRBP】澄清消息" },
    })
  })

  it("updates card with platform checkbox table for unlinked position", async () => {
    const im = fakeIm()
    const handler = makeLinkPositionCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "select_static",
        option: "pos_fe",
        value: {
          action: LINK_POSITION_SELECT_ACTION,
          platformId: "platform_liepin",
        },
      },
    }))

    expect(im.sendCardToUser).not.toHaveBeenCalled()
    expect(response).toEqual({
      card: {
        type: "raw",
        data: expect.objectContaining({
          header: expect.objectContaining({ title: expect.objectContaining({ content: "关联职位" }) }),
        }),
      },
    })
    expect(JSON.stringify(response)).toContain("请选择需要关联的平台")
  })

  it("sends clarification card on confirm for unlinked position", async () => {
    const im = fakeIm()
    const handler = makeLinkPositionCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "button",
        value: {
          action: LINK_POSITION_CONFIRM_ACTION,
          platformId: "platform_moka",
          positionId: "pos_be",
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
