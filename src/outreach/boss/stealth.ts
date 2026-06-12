/** 降低 Boss 反自动化检测：隐藏 webdriver 等常见指纹 */
export const BOSS_STEALTH_INIT_SCRIPT = `
(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => undefined, configurable: true })

  // 部分站点会检查 window.chrome
  if (!window.chrome) {
    window.chrome = { runtime: {} }
  }

  const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions)
  window.navigator.permissions.query = (parameters) =>
    parameters.name === "notifications"
      ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
      : originalQuery(parameters)
})()
`
