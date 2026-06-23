/** 演示/手动触发通知的固定接收人 */
export const DEMO_NOTIFICATION_OPEN_ID = "ou_79664ae0f2a5c43a42afeee7407632e3"

export function buildSimpleNotificationCard(title: string, content: string) {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: title },
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content,
        },
      },
    ],
  }
}

export const MOCK_LOW_SCREEN_RATE_ALERT = {
  title: "【HRBP】过筛率预警",
  content: [
    "今日【机器学习平台研发工程师】过筛率仅为 **18.6%**，低于 30% 阈值。",
    "",
    "**可能原因：**",
    "1. 关键词匹配过严，导致大量人选被误杀",
    "2. 必备条件叠加过多，漏斗过早收窄",
    "3. 渠道曝光不足，有效简历基数偏低",
    "",
    "建议优先检查策略模板中的技能关键词与必备条件配置。",
  ].join("\n"),
} as const

export const MOCK_SYNC_POSITION_REMINDER = {
  title: "【HRBP】同步职位提醒",
  content: [
    "检测到以下渠道存在 **3 个新职位** 尚未同步至系统：",
    "",
    "- Boss 直聘：2 个",
    "- 猎聘：1 个",
    "",
    "请及时完成职位关联，避免遗漏寻聘机会。",
    "关联完成后系统将自动进入澄清与寻聘流程。",
  ].join("\n"),
} as const

export function buildLowScreenRateAlertCard() {
  const { title, content } = MOCK_LOW_SCREEN_RATE_ALERT
  return buildSimpleNotificationCard(title, content)
}

export function buildSyncPositionReminderCard() {
  const { title, content } = MOCK_SYNC_POSITION_REMINDER
  return buildSimpleNotificationCard(title, content)
}

export function buildCustomNotificationCard(title: string, content: string) {
  return buildSimpleNotificationCard(title, content)
}
