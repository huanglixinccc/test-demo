import { describe, it, expect } from "vitest"
import { makeAccountBindingCardActionHandler } from "../../../src/modules/accountBinding/cardActionHandler.js"
import { START_BINDING_ACTION } from "../../../src/modules/accountBinding/constants.js"

function envelope(event: unknown) {
  return {
    schema: "2.0",
    header: {
      event_id: "e_card_1",
      event_type: "card.action.trigger",
      create_time: "x",
      token: "t",
      app_id: "a",
      tenant_key: "t",
    },
    event,
  }
}

describe("accountBinding card action handler", () => {
  it("returns select template card response on start binding action", async () => {
    const handler = makeAccountBindingCardActionHandler()

    const response = await handler(envelope({
      operator: { open_id: "ou_bind" },
      action: {
        value: { action: START_BINDING_ACTION },
        tag: "button",
      },
    }))

    expect(response).toEqual({
      card: {
        type: "template",
        data: {
          template_id: "AAqNR3G7hMhTQ",
        },
      },
    })
  })

  it("returns null for unrelated card actions", async () => {
    const handler = makeAccountBindingCardActionHandler()

    const response = await handler(envelope({
      operator: { open_id: "ou_bind" },
      action: { value: { action: "other_action" } },
    }))

    expect(response).toBeNull()
  })
})
