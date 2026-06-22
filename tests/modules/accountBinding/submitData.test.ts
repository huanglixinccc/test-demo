import { describe, it, expect } from "vitest"
import { parseCardSubmitPayload } from "../../../src/modules/accountBinding/submitData.js"

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

  it("returns null for unrelated payload", () => {
    expect(parseCardSubmitPayload({ action: "account_binding_start" })).toBeNull()
  })
})
