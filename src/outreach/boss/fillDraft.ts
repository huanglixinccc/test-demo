import type { Locator, Page } from "playwright"
import { BossDraftError } from "./errors.js"
import { BOSS_CHAT_INPUT_SELECTORS } from "./selectors.js"
import { getBossBrowserContext } from "./browser.js"
import { navigateBossChat, normalizeBossChatUrl } from "./navigate.js"
import { closeExtraBossTabs } from "./page.js"

export interface FillBossDraftOptions {
  chatUrl: string
  message: string
  profileDir: string
  cdpPort: number
  navigationTimeoutMs?: number
}

export interface FillBossDraftResult {
  filled: boolean
  chatUrl: string
  message: string
  inputSelector: string
}

async function findChatInput(page: Page, timeoutMs: number): Promise<{ locator: Locator; selector: string }> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    for (const selector of BOSS_CHAT_INPUT_SELECTORS) {
      const locator = page.locator(selector).last()
      const count = await locator.count()
      if (count === 0) continue
      try {
        if (await locator.isVisible({ timeout: 500 })) {
          return { locator, selector }
        }
      } catch {
        // try next selector
      }
    }
    await page.waitForTimeout(400)
  }
  throw new BossDraftError(
    "未找到 Boss 聊天输入框，请确认已登录且 chatUrl 指向正确会话页",
  )
}

async function fillInput(locator: Locator, message: string): Promise<void> {
  await locator.scrollIntoViewIfNeeded()
  await locator.click({ timeout: 5000 })

  const tag = await locator.evaluate((el) => el.tagName.toLowerCase())
  if (tag === "textarea" || tag === "input") {
    await locator.fill(message)
    return
  }

  await locator.evaluate((el) => {
    if (el instanceof HTMLElement) {
      el.innerText = ""
      el.textContent = ""
    }
  })
  await locator.press("ControlOrMeta+A")
  await locator.press("Backspace")
  await locator.type(message, { delay: 8 })
}

export async function fillBossChatDraft(
  opts: FillBossDraftOptions,
): Promise<FillBossDraftResult> {
  const url = normalizeBossChatUrl(opts.chatUrl)
  if (!url) throw new BossDraftError("缺少 Boss 会话链接 platformChatUrl")
  if (!/^https?:\/\//i.test(url)) {
    throw new BossDraftError("platformChatUrl 须为完整 http(s) 链接")
  }

  const message = opts.message.trim()
  if (!message) throw new BossDraftError("话术内容为空")

  const timeoutMs = opts.navigationTimeoutMs ?? 60_000
  const page = await navigateBossChat(opts.profileDir, opts.cdpPort, url, timeoutMs)
  const context = page.context()
  await closeExtraBossTabs(context, page)

  const { locator, selector } = await findChatInput(page, timeoutMs)
  await fillInput(locator, message)

  // 故意不点击发送按钮；浏览器保持打开供 HR 人工确认后发送
  return {
    filled: true,
    chatUrl: url,
    message,
    inputSelector: selector,
  }
}
