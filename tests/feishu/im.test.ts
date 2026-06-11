import { describe, it, expect, vi } from "vitest"
import { FeishuIM } from "../../src/feishu/im.js"
import type { FeishuClient } from "../../src/feishu/client.js"

function fakeClient(handler: (m: string, p: string, opts?: any) => Promise<any>): FeishuClient {
  return {
    request: vi.fn(handler),
    getTenantAccessToken: vi.fn().mockResolvedValue("tok"),
    http: { request: vi.fn().mockResolvedValue({ data: new ArrayBuffer(4) }) },
  } as unknown as FeishuClient
}

describe("FeishuIM", () => {
  it("sendTextToUser uses open_id and text msg_type", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      return {}
    })
    const im = new FeishuIM(client)
    await im.sendTextToUser("ou_x", "hello")
    expect(calls[0].m).toBe("POST")
    expect(calls[0].p).toBe("/open-apis/im/v1/messages")
    expect(calls[0].opts.params).toEqual({ receive_id_type: "open_id" })
    const data = calls[0].opts.data
    expect(data.receive_id).toBe("ou_x")
    expect(data.msg_type).toBe("text")
    expect(JSON.parse(data.content)).toEqual({ text: "hello" })
  })

  it("sendCardToUser serializes card object as content", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      return {}
    })
    const im = new FeishuIM(client)
    await im.sendCardToUser("ou_x", { elements: [] })
    expect(calls[0].opts.data.msg_type).toBe("interactive")
    expect(JSON.parse(calls[0].opts.data.content)).toEqual({ elements: [] })
  })

  it("downloadMessageFile returns Buffer", async () => {
    const client = fakeClient(async () => ({}))
    const im = new FeishuIM(client)
    const buf = await im.downloadMessageFile("om_1", "file_key_1")
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.length).toBe(4)
  })
})
