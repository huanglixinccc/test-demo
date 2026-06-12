import { describe, it, expect } from "vitest"
import { normalizeBossChatUrl } from "../../src/outreach/boss/navigate.js"

describe("normalizeBossChatUrl", () => {
  it("rewrites mobile host to www", () => {
    expect(normalizeBossChatUrl("https://m.zhipin.com/web/geek/chat?id=1")).toBe(
      "https://www.zhipin.com/web/geek/chat?id=1",
    )
  })
})
