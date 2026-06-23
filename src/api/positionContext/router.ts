import { Router, type Request, type Response, type NextFunction } from "express"
import type { FeishuIM } from "../../feishu/im.js"
import {
  buildContactableCandidateAlertCard,
  buildFirstRoundSearchConfirmationCard,
  buildLowScreenRateAlertCard,
  buildSyncPositionReminderCard,
} from "../../modules/positionContext/notificationCards.js"
import {
  resolveNotificationOpenId,
  resolveNotificationOpenIds,
  SendNotificationError,
  sendCustomNotification,
  sendNotificationCard,
} from "../../modules/positionContext/sendNotification.js"
import {
  TriggerClarificationError,
  triggerClarification,
} from "../../modules/positionContext/triggerClarification.js"

function handleApiError(
  err: unknown,
  res: Response,
  next: NextFunction,
  ErrorClass: typeof TriggerClarificationError | typeof SendNotificationError,
): void {
  if (err instanceof ErrorClass) {
    res.status(err.statusCode).json({ ok: false, error: err.message })
    return
  }
  next(err)
}

export function createPositionContextRouter(deps: { im: FeishuIM }): Router {
  const router = Router()

  router.post(
    "/manual-clarification",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const positionName =
          typeof req.body?.positionName === "string" ? req.body.positionName : ""
        const openIds = resolveNotificationOpenIds(req.body)

        const result = await triggerClarification(deps.im, { positionName, openIds })
        res.json({ ok: true, ...result })
      } catch (err) {
        handleApiError(err, res, next, TriggerClarificationError)
      }
    },
  )

  router.post(
    "/low-screen-rate-alert",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const openId = resolveNotificationOpenId(req.body)
        const result = await sendNotificationCard(
          deps.im,
          buildLowScreenRateAlertCard(),
          openId,
        )
        res.json({ ok: true, ...result })
      } catch (err) {
        handleApiError(err, res, next, SendNotificationError)
      }
    },
  )

  router.post(
    "/sync-position-reminder",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const openId = resolveNotificationOpenId(req.body)
        const result = await sendNotificationCard(
          deps.im,
          buildSyncPositionReminderCard(),
          openId,
        )
        res.json({ ok: true, ...result })
      } catch (err) {
        handleApiError(err, res, next, SendNotificationError)
      }
    },
  )

  router.post(
    "/first-round-search-confirmation",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const openId = resolveNotificationOpenId(req.body)
        const result = await sendNotificationCard(
          deps.im,
          buildFirstRoundSearchConfirmationCard(),
          openId,
        )
        res.json({ ok: true, ...result })
      } catch (err) {
        handleApiError(err, res, next, SendNotificationError)
      }
    },
  )

  router.post(
    "/contactable-candidate-alert",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const openId = resolveNotificationOpenId(req.body)
        const result = await sendNotificationCard(
          deps.im,
          buildContactableCandidateAlertCard(),
          openId,
        )
        res.json({ ok: true, ...result })
      } catch (err) {
        handleApiError(err, res, next, SendNotificationError)
      }
    },
  )

  router.post(
    "/custom-message",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const title = typeof req.body?.title === "string" ? req.body.title : ""
        const content = typeof req.body?.content === "string" ? req.body.content : ""
        const openId = resolveNotificationOpenId(req.body)

        const result = await sendCustomNotification(deps.im, { title, content }, openId)
        res.json({ ok: true, ...result })
      } catch (err) {
        handleApiError(err, res, next, SendNotificationError)
      }
    },
  )

  return router
}
