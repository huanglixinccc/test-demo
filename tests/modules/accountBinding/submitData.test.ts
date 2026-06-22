import { describe, it, expect } from "vitest"
import {
  parseCardSubmitFromAction,
  parseCardSubmitFromEvent,
  parseCardSubmitPayload,
} from "../../../src/modules/accountBinding/submitData.js"

describe("parseCardSubmitPayload", () => {
  it("parses card_submit_data payload", () => {
    expect(
      parseCardSubmitPayload({
        card_submit_data: {
          channel: ["渠道编码1", "渠道编码2"],
          account: ["账号1", "账号2"],
        },
      }),
    ).toEqual({
      card_submit_data: {
        channel: ["渠道编码1", "渠道编码2"],
        account: ["账号1", "账号2"],
      },
    })
  })

  it("parses stringified payload", () => {
    expect(
      parseCardSubmitPayload(
        JSON.stringify({
          card_submit_data: {
            channel: ["boss"],
            account: ["acc_1"],
          },
        }),
      ),
    ).toEqual({
      card_submit_data: {
        channel: ["boss"],
        account: ["acc_1"],
      },
    })
  })

  it("normalizes scalar channel/account values", () => {
    expect(
      parseCardSubmitPayload({
        card_submit_data: {
          channel: "boss",
          account: "acc_1",
        },
      }),
    ).toEqual({
      card_submit_data: {
        channel: ["boss"],
        account: ["acc_1"],
      },
    })
  })

  it("returns null for unrelated payload", () => {
    expect(parseCardSubmitPayload({ action: "account_binding_start" })).toBeNull()
  })
})

describe("parseCardSubmitFromAction", () => {
  it("parses real Feishu template form submit payload", () => {
    expect(
      parseCardSubmitFromAction({
        tag: "button",
        timezone: "Asia/Shanghai",
        form_value: {
          Select_m7d0zq95: "1",
          Select_wonbj1gybhe: "1",
        },
        name: "Button_m7t30yjl",
      }),
    ).toEqual({
      card_submit_data: {
        channel: ["1"],
        account: ["1"],
      },
    })
  })

  it("finds submit data nested in action.form_value", () => {
    expect(
      parseCardSubmitFromAction({
        tag: "button",
        form_value: {
          card_submit_data: {
            channel: ["c1"],
            account: ["a1"],
          },
        },
      }),
    ).toEqual({
      card_submit_data: {
        channel: ["c1"],
        account: ["a1"],
      },
    })
  })

  it("finds submit data deeply nested in action.value", () => {
    expect(
      parseCardSubmitFromAction({
        value: {
          payload: {
            card_submit_data: {
              channel: ["c1"],
              account: ["a1"],
            },
          },
        },
      }),
    ).toEqual({
      card_submit_data: {
        channel: ["c1"],
        account: ["a1"],
      },
    })
  })
})

describe("parseCardSubmitFromEvent", () => {
  it("finds submit data anywhere in event object", () => {
    expect(
      parseCardSubmitFromEvent({
        operator: { open_id: "ou_1" },
        action: {
          tag: "select_static",
          form_value: {
            wrapper: {
              card_submit_data: {
                channel: ["c1"],
                account: ["a1"],
              },
            },
          },
        },
      }),
    ).toEqual({
      card_submit_data: {
        channel: ["c1"],
        account: ["a1"],
      },
    })
  })
})
