import { Router, type Request, type Response, type NextFunction } from "express"
import type { FeishuIM } from "../../feishu/im.js"
import {
  TriggerClarificationError,
  normalizeOpenIds,
  triggerClarification,
} from "../../modules/positionContext/triggerClarification.js"

export function createPositionContextRouter(deps: {
  im: FeishuIM
  defaultOpenIds?: string[]
}): Router {
  const router = Router()

  router.post(
    "/manual-clarification",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const positionName =
          typeof req.body?.positionName === "string" ? req.body.positionName : ""
        const openIds = normalizeOpenIds(req.body?.openIds, deps.defaultOpenIds ?? [])

        const result = await triggerClarification(deps.im, { positionName, openIds })
        res.json({ ok: true, ...result })
      } catch (err) {
        if (err instanceof TriggerClarificationError) {
          res.status(err.statusCode).json({ ok: false, error: err.message })
          return
        }
        next(err)
      }
    },
  )

  return router
}
