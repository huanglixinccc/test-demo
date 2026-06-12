import path from "node:path"
import type { Browser, BrowserContext } from "playwright"
import { logger } from "../../utils/logger.js"
import {
  connectBossChrome,
  isBossCdpReady,
  openUrlInBossProfile,
  spawnBossChrome,
  waitForBossPage,
} from "./nativeChrome.js"

const BOSS_HOME = "https://www.zhipin.com/"

let sharedBrowser: Browser | null = null
let sharedContext: BrowserContext | null = null
let sharedProfileDir: string | null = null
let sharedCdpPort: number | null = null

export interface BossBrowserSession {
  context: BrowserContext
  profileDir: string
  cdpPort: number
}

async function disconnectShared(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch((err) => {
      logger.warn({ err }, "boss.browser.cdp_disconnect_failed")
    })
  }
  sharedBrowser = null
  sharedContext = null
  sharedProfileDir = null
  sharedCdpPort = null
}

export async function ensureBossBrowserSession(
  profileDir: string,
  cdpPort: number,
  startUrl = BOSS_HOME,
): Promise<BossBrowserSession> {
  const resolved = path.resolve(profileDir)

  if (
    sharedContext &&
    sharedProfileDir === resolved &&
    sharedCdpPort === cdpPort
  ) {
    try {
      sharedContext.pages()
      return { context: sharedContext, profileDir: resolved, cdpPort }
    } catch {
      await disconnectShared()
    }
  } else if (sharedContext) {
    await disconnectShared()
  }

  if (!(await isBossCdpReady(cdpPort))) {
    await spawnBossChrome(resolved, startUrl, cdpPort)
  } else {
    openUrlInBossProfile(resolved, startUrl)
  }

  const { browser, context } = await connectBossChrome(cdpPort)
  sharedBrowser = browser
  sharedContext = context
  sharedProfileDir = resolved
  sharedCdpPort = cdpPort

  try {
    await waitForBossPage(context, { match: "zhipin.com", timeoutMs: 20_000 })
  } catch (err) {
    logger.warn({ err }, "boss.browser.wait_home_failed")
  }

  logger.info({ profileDir: resolved, cdpPort }, "boss.browser.cdp_connected")
  return { context, profileDir: resolved, cdpPort }
}

export async function getBossBrowserContext(
  profileDir: string,
  cdpPort: number,
): Promise<BrowserContext> {
  const session = await ensureBossBrowserSession(profileDir, cdpPort)
  return session.context
}

export async function openBossUrlNative(
  profileDir: string,
  cdpPort: number,
  url: string,
): Promise<BrowserContext> {
  const session = await ensureBossBrowserSession(profileDir, cdpPort)
  openUrlInBossProfile(session.profileDir, url)
  await waitForBossPage(session.context, {
    match: "zhipin.com",
    timeoutMs: 30_000,
  })
  return session.context
}

export async function closeBossBrowser(): Promise<void> {
  await disconnectShared()
}
