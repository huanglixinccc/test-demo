import { describe, it, expect, vi } from "vitest"
import { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuClient } from "../../src/feishu/client.js"

const tables = { candidate: "tCand", interview: "tIv", referral: "tRef", jd: "tJd" }

describe("BitableTables JD lookup", () => {
  it("findJdByPosition matches exact and partial titles", async () => {
    const request = vi.fn().mockResolvedValue({
      items: [
        { record_id: "j1", fields: { position: "前端工程师", requirement: "React" } },
        { record_id: "j2", fields: { position: "后端工程师", requirement: "Java" } },
      ],
    })
    const client = { request } as unknown as FeishuClient
    const bitable = new BitableTables(client, "app", tables)

    const exact = await bitable.findJdByPosition("后端工程师")
    expect(exact?.record_id).toBe("j2")

    const partial = await bitable.findJdByPosition("前端")
    expect(partial?.record_id).toBe("j1")
  })

  it("handles Feishu text field object shape for position", async () => {
    const request = vi.fn().mockResolvedValue({
      items: [
        {
          record_id: "j3",
          fields: {
            position: [{ type: "text", text: "后端工程师" }],
            requirement: "Java",
          },
        },
      ],
    })
    const client = { request } as unknown as FeishuClient
    const bitable = new BitableTables(client, "app", tables)

    const match = await bitable.findJdByPosition("后端工程师")
    expect(match?.record_id).toBe("j3")
  })
})
