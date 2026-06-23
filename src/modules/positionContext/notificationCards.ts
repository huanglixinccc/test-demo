import { STRATEGY_SUGGESTION_KEYWORD, TASK_CLOSED_LINK_ACTION } from "./chatKeywordCards.js"

/** 演示/手动触发通知的固定接收人 */
export const DEMO_NOTIFICATION_OPEN_ID = "ou_79664ae0f2a5c43a42afeee7407632e3"

export const LOW_SCREEN_RATE_STRATEGY_BUTTON_LABEL = "寻聘策略建议修改"

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

export const MOCK_FIRST_ROUND_SEARCH_CONFIRMATION = {
  title: "【AI 产品经理】首轮寻访已完成，请确认候选人方向",
  content: [
    "您好，系统已根据当前职位画像完成首轮人才寻访。",
    "",
    "请您重点确认：",
    "• 候选人整体方向是否符合预期",
    "• 行业、公司和岗位背景是否准确",
    "• 核心能力要求是否需要调整",
    "• 薪资、年限、学历等条件是否需要放宽",
    "• 是否存在需要排除的人才类型",
    "",
    "确认后，系统将根据您的反馈更新职位画像，并继续执行下一轮寻访。",
  ].join("\n"),
} as const

export const MOCK_CONTACTABLE_CANDIDATE_ALERT = {
  title: "有新的可联系候选人，请处理",
  content:
    "你负责的职位解决方案专家（ai agent 产品）-北京市下有一个新的可联系人选 李先生，请访问下面的地址查看：https://hrp.taient.com/candidate_detail?isCandidate=0&shareUid=3f7e4371-3bd8-4b8e-9d06-e87ca699f080",
} as const

export function buildLowScreenRateAlertCard() {
  const { title, content } = MOCK_LOW_SCREEN_RATE_ALERT
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: title },
    },
    elements: [
      {
        tag: "div",
        text: { tag: "lark_md", content },
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: { tag: "plain_text", content: LOW_SCREEN_RATE_STRATEGY_BUTTON_LABEL },
            type: "default",
            value: {
              action: TASK_CLOSED_LINK_ACTION,
              message: STRATEGY_SUGGESTION_KEYWORD,
            },
          },
        ],
      },
    ],
  }
}

export function buildSyncPositionReminderCard() {
  const { title, content } = MOCK_SYNC_POSITION_REMINDER
  return buildSimpleNotificationCard(title, content)
}

export function buildFirstRoundSearchConfirmationCard() {
  const { title, content } = MOCK_FIRST_ROUND_SEARCH_CONFIRMATION
  return buildSimpleNotificationCard(title, content)
}

export function buildContactableCandidateAlertCard() {
  const { title, content } = MOCK_CONTACTABLE_CANDIDATE_ALERT
  return buildSimpleNotificationCard(title, content)
}

export function buildCustomNotificationCard(title: string, content: string) {
  return buildSimpleNotificationCard(title, content)
}
