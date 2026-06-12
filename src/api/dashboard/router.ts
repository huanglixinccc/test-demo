import { Router, type Request, type Response, type NextFunction } from "express"
import type { AIProvider } from "../../ai/provider.js"
import type { BitableTables } from "../../feishu/bitable.js"
import { parseDashboardQuery } from "./types.js"
import type { FeishuVC } from "../../feishu/vc.js"
import { BossDraftError } from "../../outreach/boss/index.js"
import { parseUpcomingPeriod } from "./types.js"
import {
  listCandidates,
  getCandidateDetail,
  updateCandidateStatus,
  getFunnel,
  getChannelStats,
  createInterviewMeeting,
  reportInterviewException,
  listUpcomingInterviews,
  updateInterviewFields,
  scoreCandidateJdMatch,
  prepareBossInterviewDraft,
  MeetingValidationError,
  JdMatchError,
} from "./handlers.js"
import { AIProviderError } from "../../ai/errors.js"
import { answerDashboardQuestion, ChatValidationError } from "./chat.js"
import { answerDashboardAgent, streamDashboardAgent } from "./chatAgent.js"
import { logger } from "../../utils/logger.js"

export function createDashboardRouter(deps: {
  bitable: BitableTables
  vc: FeishuVC
  meetingOwnerFallback: string
  ai: AIProvider
  bossEnabled?: boolean
  bossProfileDir?: string
  bossCdpPort?: number
}): Router {
  const router = Router()
  const bossEnabled = deps.bossEnabled ?? true
  const bossProfileDir = deps.bossProfileDir ?? ".boss-browser-profile"
  const bossCdpPort = deps.bossCdpPort ?? 9222

  router.get("/candidates", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseDashboardQuery(req.query as Record<string, unknown>)
      const items = await listCandidates(deps.bitable, query)
      res.json({ items })
    } catch (err) {
      next(err)
    }
  })

  router.get("/candidates/:recordId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const detail = await getCandidateDetail(deps.bitable, req.params.recordId)
      res.json(detail)
    } catch (err) {
      next(err)
    }
  })

  router.post(
    "/candidates/:recordId/match",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const force = req.body?.force === true || req.query.force === "true"
        const result = await scoreCandidateJdMatch(
          deps.ai,
          deps.bitable,
          req.params.recordId,
          force,
        )
        res.json(result)
      } catch (err) {
        if (err instanceof JdMatchError) {
          res.status(400).json({ error: err.message })
          return
        }
        next(err)
      }
    },
  )

  router.patch(
    "/candidates/:recordId/status",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const status = req.body?.status
        if (typeof status !== "string") {
          res.status(400).json({ error: "Missing status in body" })
          return
        }
        const rejectReason =
          typeof req.body?.rejectReason === "string" ? req.body.rejectReason : undefined
        const result = await updateCandidateStatus(
          deps.bitable,
          req.params.recordId,
          status,
          rejectReason,
        )
        res.json(result)
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("Invalid status")) {
          res.status(400).json({ error: err.message })
          return
        }
        next(err)
      }
    },
  )

  router.patch(
    "/interviews/:recordId/exception",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const action = req.body?.action
        if (action !== "no_show" && action !== "cancel" && action !== "resolve") {
          res.status(400).json({ error: "action 须为 no_show、cancel 或 resolve" })
          return
        }
        const note = typeof req.body?.note === "string" ? req.body.note : undefined
        const interview = await reportInterviewException(deps.bitable, req.params.recordId, {
          action,
          note,
        })
        res.json({ interview })
      } catch (err) {
        if (err instanceof MeetingValidationError) {
          res.status(400).json({ error: err.message })
          return
        }
        next(err)
      }
    },
  )

  router.patch(
    "/interviews/:recordId",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body ?? {}
        const interview = await updateInterviewFields(deps.bitable, req.params.recordId, {
          interviewTime:
            body.interviewTime != null ? Number(body.interviewTime) : undefined,
          interviewerName:
            typeof body.interviewerName === "string" ? body.interviewerName : undefined,
          interviewerOpenId:
            typeof body.interviewerOpenId === "string" ? body.interviewerOpenId : undefined,
        })
        res.json({ interview })
      } catch (err) {
        if (err instanceof MeetingValidationError) {
          res.status(400).json({ error: err.message })
          return
        }
        next(err)
      }
    },
  )

  router.post(
    "/interviews/:recordId/boss-draft",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!bossEnabled) {
          res.status(503).json({ error: "Boss 触达未启用，请设置 BOSS_OUTREACH_ENABLED=true" })
          return
        }
        const chatUrl =
          typeof req.body?.chatUrl === "string" ? req.body.chatUrl : undefined
        const result = await prepareBossInterviewDraft(
          deps.bitable,
          req.params.recordId,
          { chatUrl, profileDir: bossProfileDir, cdpPort: bossCdpPort },
        )
        res.json(result)
      } catch (err) {
        if (err instanceof BossDraftError) {
          res.status(400).json({ error: err.message })
          return
        }
        next(err)
      }
    },
  )

  router.post(
    "/interviews/:recordId/meeting",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await createInterviewMeeting(
          deps.bitable,
          deps.vc,
          req.params.recordId,
          deps.meetingOwnerFallback,
        )
        res.json(result)
      } catch (err) {
        if (err instanceof MeetingValidationError) {
          res.status(400).json({ error: err.message })
          return
        }
        next(err)
      }
    },
  )

  router.get("/interviews/upcoming", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = parseUpcomingPeriod(req.query.period)
      const items = await listUpcomingInterviews(deps.bitable, period)
      res.json({ items })
    } catch (err) {
      next(err)
    }
  })

  function parseChatBody(req: Request): {
    message: string
    history: { role: "user" | "assistant"; content: string }[]
  } | null {
    const message = req.body?.message
    if (typeof message !== "string") return null
    const rawHistory = Array.isArray(req.body?.history) ? req.body.history : []
    const history = rawHistory
      .filter(
        (m: unknown) =>
          m &&
          typeof m === "object" &&
          (m as { role?: string }).role &&
          typeof (m as { content?: string }).content === "string" &&
          ((m as { role: string }).role === "user" ||
            (m as { role: string }).role === "assistant"),
      )
      .map((m: { role: "user" | "assistant"; content: string }) => ({
        role: m.role,
        content: m.content,
      }))
    return { message, history }
  }

  router.post("/chat/stream", async (req: Request, res: Response) => {
    const body = parseChatBody(req)
    if (!body) {
      res.status(400).json({ error: "Missing message in body" })
      return
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
    res.setHeader("Cache-Control", "no-cache, no-transform")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders?.()

    const send = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    try {
      for await (const delta of streamDashboardAgent(
        deps.ai,
        deps.bitable,
        deps.vc,
        deps.meetingOwnerFallback,
        body.message,
        body.history,
      )) {
        send({ type: "delta", content: delta })
      }
      send({ type: "done" })
    } catch (err) {
      if (err instanceof ChatValidationError) {
        send({ type: "error", error: err.message })
      } else if (err instanceof AIProviderError) {
        send({ type: "error", error: err.message })
      } else {
        logger.error({ err }, "dashboard.chat.stream.error")
        send({ type: "error", error: "问答服务异常，请稍后重试" })
      }
    } finally {
      res.end()
    }
  })

  router.post("/chat", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = parseChatBody(req)
      if (!body) {
        res.status(400).json({ error: "Missing message in body" })
        return
      }

      const answer = await answerDashboardAgent(
        deps.ai,
        deps.bitable,
        deps.vc,
        deps.meetingOwnerFallback,
        body.message,
        body.history,
      )
      res.json({ answer })
    } catch (err) {
      if (err instanceof ChatValidationError) {
        res.status(400).json({ error: err.message })
        return
      }
      if (err instanceof AIProviderError) {
        res.status(502).json({ error: err.message })
        return
      }
      next(err)
    }
  })

  router.get("/funnel", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseDashboardQuery(req.query as Record<string, unknown>)
      const funnel = await getFunnel(deps.bitable, query)
      res.json(funnel)
    } catch (err) {
      next(err)
    }
  })

  router.get("/channels/stats", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseDashboardQuery(req.query as Record<string, unknown>)
      const stats = await getChannelStats(deps.bitable, query)
      res.json(stats)
    } catch (err) {
      next(err)
    }
  })

  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "dashboard.api.error")
    res.status(500).json({ error: "Internal server error" })
  })

  return router
}

export function dashboardCorsMiddleware(origins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin
    const allowAll = origins.includes("*")
    const allowed = allowAll || (origin && origins.includes(origin))
    if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", allowAll ? "*" : origin!)
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204)
      return
    }
    next()
  }
}
