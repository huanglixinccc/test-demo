/**
 * 首次使用 Boss 触达前运行：npm run boss:login
 * 用本机 Google Chrome 打开 Boss（非 Playwright 导航），登录态保存到 profile 目录。
 */
import { env } from "../config/env.js"
import { spawnBossChrome, isBossCdpReady } from "../outreach/boss/nativeChrome.js"

const BOSS_HOME = "https://www.zhipin.com/"

async function main(): Promise<void> {
  const profileDir = env.boss.browserProfileDir
  const port = env.boss.cdpPort

  console.log(`Boss 登录助手`)
  console.log(`  配置目录: ${profileDir}`)
  console.log(`  调试端口: ${port}`)
  console.log("")
  console.log("正在用本机 Chrome 打开 Boss 首页（非 Playwright 控制导航）…")

  const alreadyRunning = await isBossCdpReady(port)
  await spawnBossChrome(profileDir, BOSS_HOME, port)

  if (alreadyRunning) {
    console.log("检测到 Chrome 已在运行，已尝试新开 Boss 标签页。")
  } else {
    console.log("Chrome 已启动，请查看程序坞/Dock 中的 Google Chrome 窗口。")
  }

  console.log("")
  console.log(`目标页面: ${BOSS_HOME}`)
  console.log("请在 Chrome 中完成登录，成功后回到此终端按 Enter…")

  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve())
  })

  console.log(`登录态已保存到 ${profileDir}，可关闭或保留 Chrome 窗口。`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
