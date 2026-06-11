import express from "express"
import { logger } from "./utils/logger.js"

export function createApp() {
  const app = express()
  app.use(express.json({ limit: "2mb" }))

  app.get("/health", (_req, res) => {
    res.json({ ok: true, ts: Date.now() })
  })

  return app
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const { env } = await import("./config/env.js")
  const app = createApp()
  app.listen(env.port, () => {
    logger.info({ port: env.port }, "recruit-agent listening")
  })
}
