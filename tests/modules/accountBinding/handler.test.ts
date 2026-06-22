import { describe, it, expect, vi } from "vitest"
import { makeAccountBindingMenuHandler } from "../../../src/modules/accountBinding/handler.js"
import { START_BINDING_ACTION } from "../../../src/modules/accountBinding/constants.js"
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

describe("accountBinding menu handler", () => {
  it("sends binding card on bind_account menu event", async () => {
    const im = fakeIm()
    const handler = makeAccountBindingMenuHandler(im)

    await handler(envelope({
      event_key: "bind_account",
      operator: {
        operator_name: "张三",
        operator_id: { open_id: "ou_bind" },
      },
      timestamp: 1669364458,
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_bind",
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            actions: [
              expect.objectContaining({
                value: { action: START_BINDING_ACTION },
              }),
            ],
          }),
        ]),
      }),
    )
  })

  it("ignores unknown menu event keys", async () => {
    const im = fakeIm()
    const handler = makeAccountBindingMenuHandler(im)

    await handler(envelope({
      event_key: "other_menu",
      operator: { operator_id: { open_id: "ou_x" } },
    }))

    expect(im.sendCardToUser).not.toHaveBeenCalled()
  })

  it("ignores menu events without operator open_id", async () => {
    const im = fakeIm()
    const handler = makeAccountBindingMenuHandler(im)

    await handler(envelope({
      event_key: "bind_account",
      operator: { operator_name: "张三" },
    }))

    expect(im.sendCardToUser).not.toHaveBeenCalled()
  })
})
