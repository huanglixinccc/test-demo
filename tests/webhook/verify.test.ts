import { describe, it, expect } from "vitest"
import crypto from "node:crypto"
import { aesDecrypt, processIncoming, verifySignature } from "../../src/webhook/verify.js"

function aesEncrypt(plaintext: string, encryptKey: string): string {
  const key = crypto.createHash("sha256").update(encryptKey, "utf8").digest()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return Buffer.concat([iv, enc]).toString("base64")
}

describe("webhook verify", () => {
  const encryptKey = "test-encrypt-key"
  const verificationToken = "test-token"

  it("decrypts AES-256-CBC payload", () => {
    const enc = aesEncrypt(JSON.stringify({ hello: "world" }), encryptKey)
    const out = aesDecrypt(enc, encryptKey)
    expect(out).toEqual({ hello: "world" })
  })

  it("verifies signature", () => {
    const body = '{"encrypt":"abc"}'
    const ts = "1700000000"
    const nonce = "n1"
    const sig = crypto.createHash("sha256").update(ts + nonce + encryptKey + body).digest("hex")
    expect(verifySignature({ timestamp: ts, nonce, body, signature: sig, encryptKey })).toBe(true)
    expect(verifySignature({ timestamp: ts, nonce, body, signature: "bad", encryptKey })).toBe(false)
  })

  it("handles url_verification challenge", () => {
    const plaintext = JSON.stringify({ type: "url_verification", token: verificationToken, challenge: "ch_1" })
    const enc = aesEncrypt(plaintext, encryptKey)
    const result = processIncoming(
      { encrypt: enc },
      { rawBody: JSON.stringify({ encrypt: enc }) },
      { encryptKey, verificationToken },
    )
    expect(result.kind).toBe("url_challenge")
    if (result.kind === "url_challenge") expect(result.response.challenge).toBe("ch_1")
  })

  it("returns event envelope for normal event", () => {
    const event = {
      schema: "2.0",
      header: {
        event_id: "e1",
        event_type: "im.message.receive_v1",
        create_time: "x",
        token: verificationToken,
        app_id: "a",
        tenant_key: "t",
      },
      event: { foo: 1 },
    }
    const enc = aesEncrypt(JSON.stringify(event), encryptKey)
    const result = processIncoming({ encrypt: enc }, {}, { encryptKey, verificationToken })
    expect(result.kind).toBe("event")
    if (result.kind === "event") {
      expect(result.envelope.header.event_type).toBe("im.message.receive_v1")
    }
  })

  it("rejects mismatched verification token", () => {
    const plaintext = JSON.stringify({ type: "url_verification", token: "wrong", challenge: "ch" })
    const enc = aesEncrypt(plaintext, encryptKey)
    const result = processIncoming({ encrypt: enc }, {}, { encryptKey, verificationToken })
    expect(result.kind).toBe("invalid")
  })
})
