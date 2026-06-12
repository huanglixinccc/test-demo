import express from "express"

export interface AppDeps {
  encryptKey: string
  verificationToken: string
  feishuAppId: string
  feishuAppSecret: string
  bitableAppToken: string
  tableIds: { candidate: string; interview: string; referral: string; jd: string }
  hrOpenIds: string[]
  deepseek: { apiKey: string; baseUrl: string; model: string }
  dashboardCorsOrigins?: string[]
  bossEnabled?: boolean
  bossProfileDir?: string
  bossCdpPort?: number
}

export async function createWiredApp(deps: AppDeps): Promise<express.Express> {
  const { FeishuClient } = await import("./feishu/client.js")
  const { BitableTables } = await import("./feishu/bitable.js")
  const { FeishuIM } = await import("./feishu/im.js")
  const { createDeepSeekProvider } = await import("./ai/deepseek.js")
  const { createWebhookRouter } = await import("./webhook/router.js")
  const { FeishuEventDispatcher } = await import("./webhook/dispatcher.js")
  const { makeBotMessageHandler } = await import("./feishu/events/botMessage.js")
  const { makeBitableChangeHandler } = await import("./feishu/events/bitableChange.js")
  const { registerResumeAgent } = await import("./agents/resume/index.js")
  const { registerInterviewAgent } = await import("./agents/interview/index.js")
  const { registerReferralAgent } = await import("./agents/referral/index.js")
  const { registerAnalyticsAgent } = await import("./agents/analytics/index.js")
  const { registerJdMatchAgent } = await import("./agents/jdMatch/index.js")
  const { startInterviewWatchdog } = await import("./scheduler/interviewWatchdog.js")
  const { createDashboardRouter, dashboardCorsMiddleware } = await import("./api/dashboard/router.js")
  const { FeishuVC } = await import("./feishu/vc.js")

  const app = express()
  app.use(express.json({ limit: "2mb" }))
  app.use(dashboardCorsMiddleware(deps.dashboardCorsOrigins ?? ["*"]))

  const client = new FeishuClient({ appId: deps.feishuAppId, appSecret: deps.feishuAppSecret })
  const bitable = new BitableTables(client, deps.bitableAppToken, deps.tableIds)
  const im = new FeishuIM(client)
  const ai = createDeepSeekProvider(deps.deepseek)
  const dispatcher = new FeishuEventDispatcher()

  registerResumeAgent({ ai, bitable, im })
  registerInterviewAgent({ bitable, im, hrOpenIds: deps.hrOpenIds })
  registerReferralAgent({ ai, bitable, im })
  registerAnalyticsAgent({ ai, bitable, im })
  registerJdMatchAgent({ ai, bitable })

  dispatcher.register("im.message.receive_v1", makeBotMessageHandler(im))
  dispatcher.register(
    "drive.file.bitable_record_changed_v1",
    makeBitableChangeHandler({
      bitable,
      interviewTableId: deps.tableIds.interview,
      candidateTableId: deps.tableIds.candidate,
    }),
  )

  const vc = new FeishuVC(client)
  app.use(
    "/api/dashboard",
    createDashboardRouter({
      bitable,
      vc,
      meetingOwnerFallback: deps.hrOpenIds[0] ?? "",
      ai,
      bossEnabled: deps.bossEnabled,
      bossProfileDir: deps.bossProfileDir,
      bossCdpPort: deps.bossCdpPort,
    }),
  )

  app.get("/health", (_req, res) => {
    res.json({ ok: true, ts: Date.now() })
  })

  app.use(
    "/webhook",
    createWebhookRouter({
      encryptKey: deps.encryptKey,
      verificationToken: deps.verificationToken,
      dispatcher,
    }),
  )

  app.get("/debug/whoami", (_req, res) => {
    res.json({
      ok: true,
      hint: "给机器人私聊任意消息，日志会以 botMessage.received 记录 open_id（LOG_LEVEL=info 即可）",
    })
  })

  startInterviewWatchdog({ bitable, im, hrOpenIds: deps.hrOpenIds })

  return app
}

// Test/dev helper: build a minimal app without external deps (just /health).
export function createApp() {
  const app = express()
  app.use(express.json({ limit: "2mb" }))
  app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }))
  return app
}
