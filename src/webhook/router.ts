import express, { Router, type Request, type Response } from "express"
import { processIncoming } from "./verify.js"
import type { FeishuEventDispatcher } from "./dispatcher.js"
import { CARD_ACTION_EVENT_TYPE, resolveCardActionResponse } from "./cardAction.js"
import type { CardActionHandler } from "./cardAction.js"
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
  cardActionHandlers?: CardActionHandler[]
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

    if (result.envelope.header.event_type === CARD_ACTION_EVENT_TYPE) {
      try {
        const response = await resolveCardActionResponse(
          opts.cardActionHandlers ?? [],
          result.envelope,
        )
        logger.info(
          { eventId: result.envelope.header.event_id, hasToast: Boolean(response.toast) },
          "webhook.cardAction.responded",
        )
        res.json(response)
      } catch (err) {
        logger.error({ err, eventId: result.envelope.header.event_id }, "webhook.cardAction.error")
        res.json({ toast: { type: "error", content: "服务处理失败，请稍后重试" } })
      }
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
