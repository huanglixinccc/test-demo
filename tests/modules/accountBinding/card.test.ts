import { describe, it, expect } from "vitest"
import { buildBindingCard, buildSelectTemplateCardResponse } from "../../../src/modules/accountBinding/card.js"
import {
  BINDING_SELECT_CARD_TEMPLATE_ID,
  START_BINDING_ACTION,
} from "../../../src/modules/accountBinding/constants.js"

describe("accountBinding card", () => {
  it("buildBindingCard includes start binding callback button", () => {
    const card = buildBindingCard()
    expect(card.elements[1]).toEqual({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: { tag: "plain_text", content: "开始绑定" },
          type: "primary",
          value: { action: START_BINDING_ACTION },
        },
      ],
    })
  })

  it("buildSelectTemplateCardResponse uses hardcoded template id", () => {
    const response = buildSelectTemplateCardResponse()
    expect(response).toEqual({
      card: {
        type: "template",
        data: {
          template_id: BINDING_SELECT_CARD_TEMPLATE_ID,
        },
      },
    })
    expect(BINDING_SELECT_CARD_TEMPLATE_ID).toBe("AAqNR3G7hMhTQ")
  })
})
