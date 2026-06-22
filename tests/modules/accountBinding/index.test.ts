import { describe, it, expect, vi } from "vitest"
import { registerAccountBinding } from "../../../src/modules/accountBinding/index.js"
import { FeishuEventDispatcher } from "../../../src/webhook/dispatcher.js"
import { MENU_EVENT_TYPE } from "../../../src/modules/accountBinding/constants.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

describe("registerAccountBinding", () => {
  it("registers menu handler and exposes card action handler", () => {
    const dispatcher = new FeishuEventDispatcher()
    const registerSpy = vi.spyOn(dispatcher, "register")
    const im = {} as FeishuIM

    const { cardActionHandler } = registerAccountBinding({ dispatcher, im })

    expect(registerSpy).toHaveBeenCalledWith(MENU_EVENT_TYPE, expect.any(Function))
    expect(cardActionHandler).toEqual(expect.any(Function))
  })
})
