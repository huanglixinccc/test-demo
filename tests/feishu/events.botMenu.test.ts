import { describe, it, expect, vi } from "vitest"
import { composeMenuHandlers } from "../../src/feishu/events/botMenu.js"

describe("composeMenuHandlers", () => {
  it("runs all handlers in order", async () => {
    const calls: string[] = []
    const handler = composeMenuHandlers(
      async () => { calls.push("a") },
      async () => { calls.push("b") },
    )

    await handler({
      schema: "2.0",
      header: {
        event_id: "e1",
        event_type: "application.bot.menu_v6",
        create_time: "x",
        token: "t",
        app_id: "a",
        tenant_key: "t",
      },
      event: {},
    })

    expect(calls).toEqual(["a", "b"])
  })
})
