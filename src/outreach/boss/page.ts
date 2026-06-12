import type { BrowserContext, Page } from "playwright"

/** 复用已有 Boss 标签页 */
export async function getBossWorkPage(context: BrowserContext): Promise<Page> {
  const pages = context.pages().filter((p) => !p.isClosed())

  for (const page of pages) {
    if (page.url().includes("zhipin.com")) {
      await page.bringToFront()
      return page
    }
  }

  if (pages.length > 0) {
    const page = pages[0]!
    await page.bringToFront()
    return page
  }

  throw new Error("未找到可用的 Chrome 标签页，请确认 Chrome 已打开")
}

/** 关闭多余的空白标签 */
export async function closeExtraBossTabs(context: BrowserContext, keep: Page): Promise<void> {
  for (const page of context.pages()) {
    if (page === keep || page.isClosed()) continue
    const url = page.url()
    if (url === "about:blank" || url === "" || url === "chrome://newtab/") {
      await page.close().catch(() => {})
    }
  }
}
