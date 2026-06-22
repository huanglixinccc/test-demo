import { describe, it, expect } from "vitest"
import {
  buildBindingCard,
  buildBindingChannelOpenCard,
  buildBindingSuccessResponse,
  buildSelectTemplateCardPayload,
  buildSelectTemplateCardResponse,
} from "../../../src/modules/accountBinding/card.js"
import {
  BINDING_CHANNEL_OPEN_URL,
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

  it("buildSelectTemplateCardPayload uses hardcoded template id", () => {
    expect(buildSelectTemplateCardPayload()).toEqual({
      type: "template",
      data: { template_id: BINDING_SELECT_CARD_TEMPLATE_ID },
    })
    expect(BINDING_SELECT_CARD_TEMPLATE_ID).toBe("AAqNR3G7hMhTQ")
  })

  it("buildSelectTemplateCardResponse returns toast", () => {
    expect(buildSelectTemplateCardResponse()).toEqual({
      toast: { type: "info", content: "正在打开绑定表单…" },
    })
  })

  it("buildBindingSuccessResponse returns toast only", () => {
    expect(buildBindingSuccessResponse()).toEqual({
      toast: { type: "success", content: "绑定成功" },
    })
  })

  it("buildBindingChannelOpenCard includes url button like clarification", () => {
    const card = buildBindingChannelOpenCard()
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe("绑定成功")
    expect(serialized).toContain("打开渠道页面")
    expect(serialized).toContain(BINDING_CHANNEL_OPEN_URL)
    expect(serialized).not.toContain("open_url")
    expect(serialized).not.toContain("form_action")
  })
})
