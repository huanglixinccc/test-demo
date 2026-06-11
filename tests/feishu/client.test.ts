import { describe, it, expect, vi } from "vitest"
import { FeishuClient } from "../../src/feishu/client.js"

describe("FeishuClient", () => {
  it("caches the tenant_access_token until near expiry", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { tenant_access_token: "tok1", expire: 7200 },
    })
    const http = { post, request: vi.fn() } as any
    const client = new FeishuClient({ appId: "a", appSecret: "b", http })

    const t1 = await client.getTenantAccessToken()
    const t2 = await client.getTenantAccessToken()
    expect(t1).toBe("tok1")
    expect(t2).toBe("tok1")
    expect(post).toHaveBeenCalledTimes(1)
  })

  it("throws when API returns non-zero code", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { tenant_access_token: "tok1", expire: 7200 },
    })
    const request = vi.fn().mockResolvedValue({
      data: { code: 99991663, msg: "permission denied", data: null },
    })
    const http = { post, request } as any
    const client = new FeishuClient({ appId: "a", appSecret: "b", http })

    await expect(client.request("GET", "/x")).rejects.toThrow(/permission denied/)
  })

  it("returns data on success", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { tenant_access_token: "tok1", expire: 7200 },
    })
    const request = vi.fn().mockResolvedValue({
      data: { code: 0, msg: "ok", data: { hello: "world" } },
    })
    const http = { post, request } as any
    const client = new FeishuClient({ appId: "a", appSecret: "b", http })

    const out = await client.request<{ hello: string }>("GET", "/x")
    expect(out.hello).toBe("world")
  })
})
