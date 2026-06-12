import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import type { Browser, BrowserContext } from "playwright"
import { chromium } from "playwright"
import { BossDraftError } from "./errors.js"
import { logger } from "../../utils/logger.js"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function resolveChromePath(): string {
  if (process.platform === "darwin") {
    const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if (fs.existsSync(mac)) return mac
    throw new BossDraftError("未找到 Google Chrome，请先安装：https://www.google.com/chrome/")
  }

  if (process.platform === "win32") {
    const winCandidates = [
      path.join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ]
    const found = winCandidates.find((p) => p && fs.existsSync(p))
    if (found) return found
    throw new BossDraftError("未找到 Google Chrome，请先安装")
  }

  const linuxCandidates = ["google-chrome", "google-chrome-stable", "chromium-browser", "chromium"]
  return linuxCandidates[0]!
}

export async function isBossCdpReady(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(1500),
    })
    return res.ok
  } catch {
    return false
  }
}

/** 用系统 Chrome 原生打开 URL（不走 Playwright goto，避免 Boss 拦截 CDP 导航） */
export function openUrlInBossProfile(profileDir: string, url: string): void {
  const chrome = resolveChromePath()
  const resolved = path.resolve(profileDir)
  fs.mkdirSync(resolved, { recursive: true })

  const args = [`--user-data-dir=${resolved}`, "--no-first-run", "--no-default-browser-check", url]
  logger.info({ url, profileDir: resolved }, "boss.chrome.open_url")
  spawn(chrome, args, { detached: true, stdio: "ignore" }).unref()
}

/** 首次启动：带远程调试端口 + 直接打开目标页 */
export async function spawnBossChrome(
  profileDir: string,
  startUrl: string,
  port: number,
): Promise<void> {
  if (await isBossCdpReady(port)) {
    openUrlInBossProfile(profileDir, startUrl)
    await sleep(1500)
    return
  }

  const chrome = resolveChromePath()
  const resolved = path.resolve(profileDir)
  fs.mkdirSync(resolved, { recursive: true })

  const args = [
    `--user-data-dir=${resolved}`,
    `--remote-debugging-port=${port}`,
    "--no-first-run",
    "--no-default-browser-check",
    startUrl,
  ]

  logger.info({ port, url: startUrl, profileDir: resolved }, "boss.chrome.spawn")
  spawn(chrome, args, { detached: true, stdio: "ignore" }).unref()

  for (let i = 0; i < 40; i++) {
    if (await isBossCdpReady(port)) {
      await sleep(1000)
      return
    }
    await sleep(500)
  }

  throw new BossDraftError(
    "Chrome 启动超时。请确认已安装 Google Chrome，且端口 " +
      port +
      " 未被占用（可设置 BOSS_CDP_PORT 换端口）",
  )
}

export async function connectBossChrome(port: number): Promise<{
  browser: Browser
  context: BrowserContext
}> {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
  const context = browser.contexts()[0]
  if (!context) {
    throw new BossDraftError("已连接 Chrome，但未找到浏览器上下文")
  }
  return { browser, context }
}

export async function waitForBossPage(
  context: BrowserContext,
  opts: { match?: string | RegExp; timeoutMs?: number } = {},
): Promise<import("playwright").Page> {
  const timeoutMs = opts.timeoutMs ?? 30_000
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    for (const page of context.pages()) {
      if (page.isClosed()) continue
      const url = page.url()
      if (!url.includes("zhipin.com")) continue
      if (!opts.match) {
        await page.bringToFront().catch(() => {})
        return page
      }
      if (typeof opts.match === "string" && url.includes(opts.match)) {
        await page.bringToFront().catch(() => {})
        return page
      }
      if (opts.match instanceof RegExp && opts.match.test(url)) {
        await page.bringToFront().catch(() => {})
        return page
      }
    }
    await sleep(400)
  }

  const urls = context.pages().map((p) => p.url()).join(", ")
  throw new BossDraftError(
    `等待 Boss 页面打开超时。当前标签：${urls || "无"}。请在 Chrome 地址栏手动打开目标链接`,
  )
}
