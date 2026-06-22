import { describe, it, expect, vi } from "vitest"
import express from "express"
import request from "supertest"
import crypto from "node:crypto"
import { createWebhookRouter } from "../../src/webhook/router.js"
import { FeishuEventDispatcher } from "../../src/webhook/dispatcher.js"

function aesEncrypt(plaintext: string, encryptKey: string): string {
  const key = crypto.createHash("sha256").update(encryptKey, "utf8").digest()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return Buffer.concat([iv, enc]).toString("base64")
}

function buildApp(): { app: express.Express; dispatcher: FeishuEventDispatcher } {
  const dispatcher = new FeishuEventDispatcher()
  const app = express()
  app.use("/webhook", createWebhookRouter({
    encryptKey: "k",
    verificationToken: "t",
    dispatcher,
  }))
  return { app, dispatcher }
}

describe("webhook router", () => {
  it("returns challenge for url_verification", async () => {
    const { app } = buildApp()
    const enc = aesEncrypt(JSON.stringify({ type: "url_verification", token: "t", challenge: "ch" }), "k")
    const res = await request(app).post("/webhook/feishu").send({ encrypt: enc })
    expect(res.status).toBe(200)
    expect(res.body.challenge).toBe("ch")
  })

  it("returns template card for card.action.trigger", async () => {
    const dispatcher = new FeishuEventDispatcher()
    const cardActionHandler = vi.fn().mockResolvedValue({
      toast: { type: "info", content: "正在打开绑定表单…" },
    })
    const app = express()
    app.use("/webhook", createWebhookRouter({
      encryptKey: "k",
      verificationToken: "t",
      dispatcher,
      cardActionHandlers: [cardActionHandler],
    }))

    const envelope = {
      schema: "2.0",
      header: {
        event_id: "e_card_1",
        event_type: "card.action.trigger",
        create_time: "x",
        token: "t",
        app_id: "a",
        tenant_key: "t",
      },
      event: { action: { value: { action: "account_binding_start" } } },
    }
    const enc = aesEncrypt(JSON.stringify(envelope), "k")
    const res = await request(app).post("/webhook/feishu").send({ encrypt: enc })
    expect(res.status).toBe(200)
    expect(res.body.toast.content).toBe("正在打开绑定表单…")
    expect(cardActionHandler).toHaveBeenCalledTimes(1)
  })

  it("dispatches event and returns ok", async () => {
    const { app, dispatcher } = buildApp()
    const handler = vi.fn()
    dispatcher.register("im.message.receive_v1", handler)

    const envelope = {
      schema: "2.0",
      header: {
        event_id: "e_router_1",
        event_type: "im.message.receive_v1",
        create_time: "x",
        token: "t",
        app_id: "a",
        tenant_key: "t",
      },
      event: { foo: 1 },
    }
    const enc = aesEncrypt(JSON.stringify(envelope), "k")
    const res = await request(app).post("/webhook/feishu").send({ encrypt: enc })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    await new Promise((r) => setTimeout(r, 50))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("rejects bad encryption (invalid)", async () => {
    const { app } = buildApp()
    const res = await request(app).post("/webhook/feishu").send({ encrypt: "not-real-base64" })
    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })
})
