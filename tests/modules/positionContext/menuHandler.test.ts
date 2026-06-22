import { describe, it, expect, vi, beforeEach } from "vitest"
import { makePositionSelectMenuHandler } from "../../../src/modules/positionContext/menuHandler.js"
import { positionContextStore } from "../../../src/modules/positionContext/store.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

function envelope(event: unknown) {
  return {
    schema: "2.0",
    header: {
      event_id: "e_menu_1",
      event_type: "application.bot.menu_v6",
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

describe("position select menu handler", () => {
  beforeEach(() => {
    positionContextStore.clearForTesting()
  })

  it("sends position select card on select_positions menu event", async () => {
    const im = fakeIm()
    const handler = makePositionSelectMenuHandler(im)

    await handler(envelope({
      event_key: "select_positions",
      operator: { operator_id: { open_id: "ou_hr" } },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "选择工作区职位" }),
        }),
      }),
    )
  })

  it("ignores other menu keys", async () => {
    const im = fakeIm()
    const handler = makePositionSelectMenuHandler(im)

    await handler(envelope({
      event_key: "bind_account",
      operator: { operator_id: { open_id: "ou_hr" } },
    }))

    expect(im.sendCardToUser).not.toHaveBeenCalled()
  })
})
