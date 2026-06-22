import { describe, it, expect } from "vitest"
import { buildBindingCard } from "../../../src/modules/accountBinding/card.js"
import { BINDING_URL } from "../../../src/modules/accountBinding/constants.js"

describe("accountBinding card", () => {
  it("buildBindingCard includes hardcoded binding link", () => {
    const card = buildBindingCard()
    expect(card.elements[1]?.text.content).toBe(`[开始绑定](${BINDING_URL})`)
    expect(BINDING_URL).toBe("https://hrp.taient.com/dashboard")
  })
})
