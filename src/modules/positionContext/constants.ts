export const MENU_EVENT_TYPE = "application.bot.menu_v6"

export const SELECT_POSITIONS_EVENT_KEY = "select_positions"

export const SELECT_POSITION_ACTION = "select_position"

export const LINK_POSITION_SELECT_ACTION = "link_position_select"

export const LINK_POSITION_CONFIRM_ACTION = "link_position_confirm"

export const CLARIFICATION_H5_URL =
  "https://www.taient.com/common/job-clarification-voice-h5.html"

/** 开启寻聘后自动打开的演示页面 */
export const RECRUITMENT_OPEN_URL = "https://rj01h11p8902.taient.com/"

export const START_CLARIFICATION_ACTION = "start_clarification"

export const START_RECRUITMENT_ACTION = "start_recruitment"

/** 寻聘策略卡片上的演示模式按钮（选择不影响后续逻辑） */
export const RECRUITMENT_MODE_OPTIONS = [
  "仅人岗匹配",
  "人岗匹配+意向确认",
  "人岗匹配+意向确认+约面",
] as const

/** 点击开始澄清后，延迟发送寻聘策略卡片 */
export const RECRUITMENT_STRATEGY_DELAY_MS = 10_000

/** 演示用策略模板名称 */
export const MOCK_RECRUITMENT_STRATEGY_TEMPLATE = "锐捷—职能类职位"

/** 私聊关键词触发的演示澄清职位名 */
export const DEMO_CLARIFICATION_POSITION_NAME = "HRBP"

/** 演示/手动触发通知的固定接收人 */
export const DEMO_NOTIFICATION_OPEN_ID = "ou_79664ae0f2a5c43a42afeee7407632e3"

/** 演示/手动触发通知的默认接收人姓名 */
export const DEMO_NOTIFICATION_RECIPIENT_NAME = "李哲乐"
