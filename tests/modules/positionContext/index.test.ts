import { describe, it, expect } from "vitest"
import { registerPositionContext } from "../../../src/modules/positionContext/index.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

describe("registerPositionContext", () => {
  it("exposes menu and card action handlers", () => {
    const im = {} as FeishuIM
    const { cardActionHandler, menuHandler } = registerPositionContext({ im })

    expect(cardActionHandler).toEqual(expect.any(Function))
    expect(menuHandler).toEqual(expect.any(Function))
  })
})
