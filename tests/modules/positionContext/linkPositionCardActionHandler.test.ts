import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { makeLinkPositionCardActionHandler } from "../../../src/modules/positionContext/linkPositionCardActionHandler.js"
import {
  LINK_POSITION_CONFIRM_ACTION,
  LINK_POSITION_SELECT_ACTION,
  RECRUITMENT_STRATEGY_DELAY_MS,
  START_CLARIFICATION_ACTION,
  START_RECRUITMENT_ACTION,
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
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
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
    expect(response).toEqual({ toast: { type: "info", content: "已选择" } })
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

  it("schedules recruitment strategy card 10s after start clarification", async () => {
    const im = fakeIm()
    const handler = makeLinkPositionCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "button",
        value: {
          action: START_CLARIFICATION_ACTION,
          positionName: "前端工程师",
        },
      },
    }))

    expect(response).toEqual({ toast: { type: "info", content: "正在打开澄清页面" } })
    expect(im.sendCardToUser).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(RECRUITMENT_STRATEGY_DELAY_MS - 1)
    expect(im.sendCardToUser).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            text: expect.objectContaining({
              content: expect.stringContaining("【前端工程师】寻聘策略已生成"),
            }),
          }),
        ]),
      }),
    )
  })

  it("returns success toast when start recruitment is clicked", async () => {
    const im = fakeIm()
    const handler = makeLinkPositionCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_hr" },
      action: {
        tag: "button",
        value: {
          action: START_RECRUITMENT_ACTION,
          positionName: "前端工程师",
        },
      },
    }))

    expect(response).toEqual({ toast: { type: "success", content: "任务已启动" } })
    expect(im.sendCardToUser).not.toHaveBeenCalled()
  })

})
