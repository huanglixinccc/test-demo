import crypto from "node:crypto"

export interface DecryptedEnvelope {
  schema?: string
  header: {
    event_id: string
    event_type: string
    create_time: string
    token: string
    app_id: string
    tenant_key: string
  }
  event: unknown
}

export interface UrlChallengeResponse {
  challenge: string
}

export interface VerifyContext {
  encryptKey: string
  verificationToken: string
}

function deriveAesKey(encryptKey: string): Buffer {
  return crypto.createHash("sha256").update(encryptKey, "utf8").digest()
}

export function aesDecrypt(encrypted: string, encryptKey: string): unknown {
  const buf = Buffer.from(encrypted, "base64")
  const iv = buf.subarray(0, 16)
  const data = buf.subarray(16)
  const key = deriveAesKey(encryptKey)
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
  const plain = Buffer.concat([decipher.update(data), decipher.final()])
  return JSON.parse(plain.toString("utf8"))
}

export function verifySignature(opts: {
  timestamp: string
  nonce: string
  body: string
  signature: string
  encryptKey: string
}): boolean {
  const raw = opts.timestamp + opts.nonce + opts.encryptKey + opts.body
  const hash = crypto.createHash("sha256").update(raw, "utf8").digest("hex")
  return hash === opts.signature
}

export type VerifyResult =
  | { kind: "url_challenge"; response: UrlChallengeResponse }
  | { kind: "event"; envelope: DecryptedEnvelope }
  | { kind: "invalid"; reason: string }

export function processIncoming(
  raw: { encrypt?: string; challenge?: string; type?: string; token?: string; [k: string]: unknown },
  headers: { timestamp?: string; nonce?: string; signature?: string; rawBody?: string },
  ctx: VerifyContext,
): VerifyResult {
  let payload: any = raw

  if (typeof raw.encrypt === "string") {
    if (headers.timestamp && headers.nonce && headers.signature && headers.rawBody) {
      const ok = verifySignature({
        timestamp: headers.timestamp,
        nonce: headers.nonce,
        body: headers.rawBody,
        signature: headers.signature,
        encryptKey: ctx.encryptKey,
      })
      if (!ok) return { kind: "invalid", reason: "bad_signature" }
    }
    try {
      payload = aesDecrypt(raw.encrypt, ctx.encryptKey)
    } catch {
      return { kind: "invalid", reason: "decrypt_failed" }
    }
  }

  if (payload?.type === "url_verification") {
    if (payload.token !== ctx.verificationToken) {
      return { kind: "invalid", reason: "bad_verification_token" }
    }
    return { kind: "url_challenge", response: { challenge: payload.challenge } }
  }

  if (payload?.header?.token && payload.header.token !== ctx.verificationToken) {
    return { kind: "invalid", reason: "bad_event_token" }
  }
  if (!payload?.header?.event_type) {
    return { kind: "invalid", reason: "no_event_type" }
  }
  return { kind: "event", envelope: payload as DecryptedEnvelope }
}
