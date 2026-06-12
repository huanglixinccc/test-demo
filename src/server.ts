import { createWiredApp } from "./app.js"
import { env } from "./config/env.js"
import { logger } from "./utils/logger.js"

const app = await createWiredApp({
  encryptKey: env.feishu.encryptKey,
  verificationToken: env.feishu.verificationToken,
  feishuAppId: env.feishu.appId,
  feishuAppSecret: env.feishu.appSecret,
  bitableAppToken: env.feishu.bitableAppToken,
  tableIds: env.tables,
  hrOpenIds: env.hrOpenIds,
  deepseek: env.deepseek,
  dashboardCorsOrigins: env.dashboardCorsOrigins,
  bossEnabled: env.boss.enabled,
  bossProfileDir: env.boss.browserProfileDir,
  bossCdpPort: env.boss.cdpPort,
})

app.listen(env.port, () => {
  logger.info({ port: env.port }, "recruit-agent listening")
})
