import express, { Router, type Request, type Response } from "express"
import { processIncoming } from "./verify.js"
import type { FeishuEventDispatcher } from "./dispatcher.js"
import { logger } from "../utils/logger.js"

declare module "express-serve-static-core" {
  interface Request {
    rawBody?: string
  }
}

export function createWebhookRouter(opts: {
  encryptKey: string
  verificationToken: string
  dispatcher: FeishuEventDispatcher
}) {
  const router = Router()

  // Capture raw body for signature verification (signature is over the exact
  // bytes Feishu sent, not over JSON.stringify(req.body) which may differ in
  // whitespace/key order).
  router.use(
    express.json({
      limit: "2mb",
      verify: (req, _res, buf) => {
        ;(req as Request).rawBody = buf.toString("utf8")
      },
    }),
  )

  router.post("/feishu", async (req: Request, res: Response) => {
    const result = processIncoming(req.body ?? {}, {
      timestamp: req.header("X-Lark-Request-Timestamp") ?? undefined,
      nonce: req.header("X-Lark-Request-Nonce") ?? undefined,
      signature: req.header("X-Lark-Signature") ?? undefined,
      rawBody: req.rawBody,
    }, opts)

    if (result.kind === "url_challenge") {
      res.json(result.response)
      return
    }
    if (result.kind === "invalid") {
      logger.warn({ reason: result.reason }, "webhook.invalid")
      res.status(400).json({ ok: false, reason: result.reason })
      return
    }

    res.json({ ok: true })
    setImmediate(() => {
      opts.dispatcher.dispatch(result.envelope).catch((err) => {
        logger.error({ err }, "webhook.dispatch_error")
      })
    })
  })

  return router
}
