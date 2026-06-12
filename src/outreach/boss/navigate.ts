import type { Page } from "playwright"
import { BossDraftError } from "./errors.js"
import { openBossUrlNative } from "./browser.js"
import { waitForBossPage } from "./nativeChrome.js"
import { getBossWorkPage } from "./page.js"

const BOSS_HOME = "https://www.zhipin.com/"

export function normalizeBossChatUrl(raw: string): string {
  const url = raw.trim()
  if (!url) return url
  return url.replace(/^https?:\/\/m\.zhipin\.com/i, "https://www.zhipin.com")
}

function isLoginUrl(url: string): boolean {
  return /login|sign|passport/i.test(url)
}

async function assertPageLoaded(page: Page): Promise<void> {
  const snapshot = await page
    .evaluate(() => ({
      url: location.href,
      title: document.title,
      textLen: document.body?.innerText?.trim().length ?? 0,
      childCount: document.body?.children.length ?? 0,
    }))
    .catch(() => ({ url: page.url(), title: "", textLen: 0, childCount: 0 }))

  if (snapshot.textLen >= 20 || snapshot.childCount >= 3) return

  throw new BossDraftError(
    [
      "Boss 页面未正常加载。",
      `当前：${snapshot.url || page.url()}`,
      "请在 Chrome 中手动完成登录，或删除 .boss-browser-profile 后重新 npm run boss:login",
    ].join("\n"),
  )
}

export async function navigateBossChat(
  profileDir: string,
  cdpPort: number,
  chatUrl: string,
  timeoutMs: number,
): Promise<Page> {
  const target = normalizeBossChatUrl(chatUrl)

  // 用 Chrome 原生方式打开首页（避免 Playwright goto 被拦截）
  const context = await openBossUrlNative(profileDir, cdpPort, BOSS_HOME)
  let page = await waitForBossPage(context, { match: "zhipin.com", timeoutMs })
  await page.waitForTimeout(1500)

  if (isLoginUrl(page.url())) {
    throw new BossDraftError(
      "Boss 未登录或登录已过期，请先运行 npm run boss:login 并在 Chrome 中完成登录",
    )
  }

  await assertPageLoaded(page)

  // 再用原生方式打开会话页
  await openBossUrlNative(profileDir, cdpPort, target)
  page = await waitForBossPage(context, { match: "zhipin.com", timeoutMs })
  await page.waitForTimeout(2000)

  if (isLoginUrl(page.url())) {
    throw new BossDraftError("打开会话页时被重定向到登录页，请重新运行 npm run boss:login")
  }

  await assertPageLoaded(page)
  page = await getBossWorkPage(context)
  return page
}
