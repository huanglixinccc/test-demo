/** 演示用今日寻聘数据（写死） */
export const MOCK_RECRUITMENT_DATA = {
  date: "2026/06/22",
  detailOpens: 42,
  greetings: 21,
  followUps: 3,
  replies: 3,
  resumeRequests: 6,
  contacts: 8,
} as const

const SEARCH_STRATEGY_TEMPLATE_MD = `**寻访任务：**

1.推荐任务：每次刷列表人数300，查看详情10人，给10人打招呼，自动筛选，支持沟通提纲。

2.投递任务：主动索要简历，不主动交换电话，不主动交换微信，接受用户的附件，不更新简历，不读取全量，自动筛选，进行渠道条件过滤，不跳过已有人选，判断沟通提纲，人选查看范围为7天内，非自动执行，执行时间未指定。

3.沟通任务：人选查看范围为所有人选，接受并下载附件，主动索要简历，不主动交换电话，不主动交换微信，不更新简历，不读取全量，自动筛选，使用渠道条件过滤，不跳过已有人选，判断沟通提纲，查看7天内的人选，支持自动沟通，自动执行为否，执行时间未指定。

**匹配要求：**

1.学历要求：本科以上（必备条件）；学历性质：统招（必备条件）

2.过往公司知名度：目标公司（非排除）：非必备华三、非必备浪潮、非必备华为、非必备宁畅、非必备曙光、非必备云尖、非必备中兴、非必备华勤。

**筛选标准：**

如果人选有3段及以上工作经历，那么要求最近3段工作经历时长之和大于6年(不含空窗期)，且最近3段中任意两段经历不能同时小于1年；如果人选有2段工作经历，那么要求最近2段工作经历时长之和大于3年(不含实习和空窗期)，且2段工作经历中必须有1段大于等于2年；如果人选毕业后仅一段工作经历，那么这段工作经历必须大于等于3年。`

export function buildRecruitmentDataCard() {
  const { date, detailOpens, greetings, followUps, replies, resumeRequests, contacts } =
    MOCK_RECRUITMENT_DATA

  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: "【HRBP】今日寻聘数据" },
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: [
            `**日期：**${date}`,
            `**打开详情数：**${detailOpens}`,
            `**招呼数：**${greetings}`,
            `**追聊数：**${followUps}`,
            `**回复数：**${replies}`,
            `**索要数：**${resumeRequests}`,
            `**联系方式数：**${contacts}`,
          ].join("\n"),
        },
      },
    ],
  }
}

export function buildSearchStrategyTemplateCard() {
  return {
    config: { wide_screen_mode: true },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: SEARCH_STRATEGY_TEMPLATE_MD,
        },
      },
    ],
  }
}

/** 演示用淘汰理由分析（写死） */
export const MOCK_REJECTION_REASONS = [
  "能力不匹配：36",
  "人岗匹配结果：基本属性工作地点不满足必须条件: 要求上海市：32",
  "人岗匹配结果：基本属性经验年限不满足必须条件: >=5、<=10：28",
  "人岗匹配结果：人选的期望职位不符：16",
  "人岗匹配结果：基本属性年龄不满足必须条件: >=25、<=40：14",
  "人岗匹配结果：基本属性期望薪资不满足必须条件: <=50000、>=30000：13",
  "不合适：10",
  "地点不合适：6",
  "简历太简单：3",
  "学历不合适：3",
] as const

export function buildRejectionReasonAnalysisCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: "【HRBP】淘汰理由分析" },
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "plain_text",
          content: MOCK_REJECTION_REASONS.join("\n"),
        },
      },
    ],
  }
}

/** 演示用人工淘汰理由分析（写死） */
export const MOCK_MANUAL_REJECTION_REASONS = [
  "不合适：2",
  "学历不合适：1",
  "不合适，学历不合适：1",
] as const

export const MOCK_MANUAL_REJECTION_POSITION = "机器学习平台研发工程师"

export function buildManualRejectionReasonAnalysisCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: {
        tag: "plain_text",
        content: `【${MOCK_MANUAL_REJECTION_POSITION}】人工淘汰理由分析`,
      },
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "plain_text",
          content: MOCK_MANUAL_REJECTION_REASONS.join("\n"),
        },
      },
    ],
  }
}

export const TASK_CLOSED_LINK_ACTION = "task_closed_link"

export const TASK_CLOSED_LINKS = [
  { label: "查询今日进展", message: "寻聘数据" },
  { label: "查看职位画像", message: "查看职位画像" },
  { label: "招呼数太少原因", message: "招呼数太少原因" },
  { label: "淘汰理由分析", message: "淘汰理由分析" },
  { label: "寻聘策略修改建议", message: "寻聘策略修改建议" },
] as const

/** 任务关闭卡片链接对应的固定私聊文本回复 */
export const FIXED_CHAT_TEXT_REPLIES: Record<string, string> = {
  查看职位画像:
    "【职位画像】本科及以上学历，5-10年相关经验，熟悉机器学习平台研发与部署，具备分布式系统实践经验，沟通协作能力强。",
  招呼数太少原因:
    "今日招呼数偏少，可能原因：1. 活跃时段未覆盖 2. 筛选条件过严 3. 渠道曝光不足 4. 职位竞争力待提升。",
}

export function buildTaskClosedCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: "【HRBP】寻聘任务已关闭" },
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "plain_text",
          content: TASK_CLOSED_LINKS.map((link) => link.label).join(" 丨 "),
        },
      },
      {
        tag: "action",
        actions: TASK_CLOSED_LINKS.map((link) => ({
          tag: "button",
          text: { tag: "plain_text", content: link.label },
          type: "default",
          value: {
            action: TASK_CLOSED_LINK_ACTION,
            message: link.message,
          },
        })),
      },
    ],
  }
}

export const MOCK_STRATEGY_TEMPLATE_SUGGESTION_POSITION = "安卓高级开发工程师"

const STRATEGY_TEMPLATE_SUGGESTION_MD = `**当前值：**技能关键词：车(必须)、App(必须)、开发(必备)、Android开发框架、Android应用性能优化、Android调试工具与方法、Java或Kotin、代码规范问题分析与故障排查、车载应用开发(加分)

<font color='red'>**建议值：**</font>技能关键词:车@@汽车@@车载@@车联网(必备)、App@@客客户端@@移动端(必备)、开发(必备)、Android开发框架、Android应用性能优化、Android调试工具与方法、Java或Kotlin、代码规范问题分析与故障排查、车载应用开发(加分)。

<font color='blue'>**依据：**</font>anavsis feedback明确指出"关键词:车app，通过率14.3%-这是当前最明显的卡点"，日建议改成车/汽车/出行/智能舱/车联网/app/客户端/移动""中的可选命中。结合temexplained对"关键词"的定义，"逗号..都是目的关系，多个@@分隔的值之间才是或的关系"，当前把"车(必须)、App(必须)"并列为必备，极易造成匹配率为。将两组核心词改为组内或关系，能在不删除岗位核心方向"车载安卓"的前提下，减少误杀，优先修复匹配率和过筛后的查看量。该修改只落在policy.conditions支持的skils子模型中，且未触碰职位画像中仍需保留的车载安卓方向、Android开发经验"这一硬约束，合规且属于最小改动。`

export function buildStrategyTemplateSuggestionCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: {
        tag: "plain_text",
        content: `【${MOCK_STRATEGY_TEMPLATE_SUGGESTION_POSITION}】配置修改建议已生成`,
      },
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: STRATEGY_TEMPLATE_SUGGESTION_MD,
        },
      },
    ],
  }
}
