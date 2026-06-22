import { describe, it, expect, vi } from "vitest"
import { registerAccountBinding } from "../../../src/modules/accountBinding/index.js"
import { FeishuEventDispatcher } from "../../../src/webhook/dispatcher.js"
import { MENU_EVENT_TYPE } from "../../../src/modules/accountBinding/constants.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

describe("registerAccountBinding", () => {
  it("registers application.bot.menu_v6 handler on dispatcher", () => {
    const dispatcher = new FeishuEventDispatcher()
    const registerSpy = vi.spyOn(dispatcher, "register")
    const im = {} as FeishuIM

    registerAccountBinding({ dispatcher, im })

    expect(registerSpy).toHaveBeenCalledWith(MENU_EVENT_TYPE, expect.any(Function))
  })
})
