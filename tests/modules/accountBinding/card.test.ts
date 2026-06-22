import { describe, it, expect } from "vitest"
import {
  buildBindingCard,
  buildBindingSelectCard,
  buildBindingSuccessResponse,
  buildSelectTemplateCardPayload,
  buildSelectTemplateCardResponse,
} from "../../../src/modules/accountBinding/card.js"
import {
  BINDING_CHANNEL_OPEN_URL,
  BINDING_FORM_ACCOUNT_FIELD,
  BINDING_FORM_CHANNEL_FIELD,
  BINDING_SELECT_CARD_TEMPLATE_ID,
  BINDING_SUBMIT_BUTTON_NAME,
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
      toast: { type: "info", content: "正在打开绑定表单，请在最新卡片中提交" },
    })
  })

  it("buildBindingSuccessResponse returns toast only", () => {
    expect(buildBindingSuccessResponse()).toEqual({
      toast: { type: "success", content: "绑定成功" },
    })
  })

  it("buildBindingSelectCard uses JSON 2.0 form submit with open_url", () => {
    const card = buildBindingSelectCard()
    const serialized = JSON.stringify(card)

    expect(card.schema).toBe("2.0")
    expect(card.header.title.content).toBe("请选择招聘渠道和账号")
    expect(serialized).toContain(BINDING_FORM_CHANNEL_FIELD)
    expect(serialized).toContain(BINDING_FORM_ACCOUNT_FIELD)
    expect(serialized).toContain(BINDING_SUBMIT_BUTTON_NAME)
    expect(serialized).toContain(BINDING_CHANNEL_OPEN_URL)
    expect(serialized).toContain('"form_action_type":"submit"')
    expect(serialized).toContain('"type":"open_url"')
    expect(serialized).toContain("applink.feishu.cn")
    expect(serialized).not.toContain('"type":"form_action"')
    expect(serialized).not.toContain("complex_interaction")
  })
})
