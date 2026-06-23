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

import {
  LOW_GREETING_MD,
  PENDING_CANDIDATES_MD,
  RECRUITMENT_MODEL_MD,
  TODAY_DATA_MD,
  TODAY_PROGRESS_MD,
} from "./chatKeywordTexts.js"

function buildMarkdownReplyCard(title: string, content: string) {
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
    ],
  }
}

export function buildLowGreetingCard() {
  return buildMarkdownReplyCard("【HRBP】招呼数分析", LOW_GREETING_MD)
}

export function buildTodayProgressCard() {
  return buildMarkdownReplyCard("【HRBP】今日执行进展", TODAY_PROGRESS_MD)
}

export function buildTodayDataCard() {
  return buildMarkdownReplyCard("【HRBP】今日寻聘数据", TODAY_DATA_MD)
}

export function buildPendingCandidatesCard() {
  return buildMarkdownReplyCard("【HRBP】今日待处理候选人", PENDING_CANDIDATES_MD)
}

export function buildRecruitmentModelCard() {
  return buildMarkdownReplyCard("【HRBP】寻聘模型", RECRUITMENT_MODEL_MD)
}

export const TASK_CLOSED_LINK_ACTION = "task_closed_link"

export const STRATEGY_SUGGESTION_KEYWORD = "寻聘策略修改建议"

export const TASK_CLOSED_LINKS = [
  { label: "查询今日进展", message: "寻聘数据" },
  { label: "查看待处理人员", message: "查看待处理人员" },
  { label: "寻聘策略修改建议", message: STRATEGY_SUGGESTION_KEYWORD },
] as const

/** 任务关闭卡片链接对应的固定私聊文本回复 */
export const FIXED_CHAT_TEXT_REPLIES: Record<string, string> = {
  查看职位画像:
    "【职位画像】本科及以上学历，5-10年相关经验，熟悉机器学习平台研发与部署，具备分布式系统实践经验，沟通协作能力强。",
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

export const MOCK_STRATEGY_TEMPLATE_SUGGESTION_POSITION = "HRBP"

const STRATEGY_TEMPLATE_SUGGESTION_MD = `从今天的数据看，配置当前不是"卡得太严"，而是"区分度不够，筛到的人虽然能打招呼，但对最终产出帮助有限"。更具体地说，问题主要不在招呼动作，而在筛选配置没有把真正高价值人群收得更准。

**支撑这个判断的关键数据有 4 个：**

**1. 前段执行量并不低**
现在是 10:26，今天大约过去了 15.2% 的工作时间。按目标推算，此时预期应完成约 8 个查看、5 个招呼；实际已完成 10 个查看、9 个招呼，前段动作是达标的，说明不是"搜不到人"或"执行没跟上"。

**2. 招呼率很高，但不一定代表配置有效**
今日招呼率 90.0%，高于近 3 日均值 56.3%。这意味着看过的人里大部分都被打了招呼，通常说明当前筛选出来的人"表面上都还行"，但也可能意味着筛选条件不够聚焦，导致大量"看起来能聊、但未必是最优目标"的人被放进来了。

**3. 过筛率偏高，配置有偏松迹象**
今日过筛率 21.7%，高于近 3 日的 15.5%。按经验，这个水平不算严，反而偏高，说明当前配置并没有把人卡得很死。若最终成果没有同步放大，往往意味着过滤条件缺少真正有区分度的硬约束。

**4. 最明显的问题在条件本身：多个条件几乎不起筛选作用**
- 关键词通过率 40.0%
- 学历否决条件通过率 100.0%
- 学历通过率 100.0%
- 年龄通过率 100.0%
- 工作经验通过率 100.0%

这组数据很关键：年龄、学历、经验几乎没有筛选作用，说明它们对当前候选池基本不构成约束；而关键词通过率 40.0% 也偏高，说明关键词集合本身可能过宽、混合了多个方向，导致"沾边的人"被放进来很多。

**【关键证据】**
1. 整体过筛率 21.7%；60 个列表人选里，有 13 个进入查看详情。按现有口径，合理线应低于 3%
2. 条件通过率里，学历否决、学历、年龄、工作经验全部是 100%；这些条件基本没有起到筛人作用
3. 推荐任务和搜索任务都没有设置曾任职位；活跃度只卡到"本周内活跃/近一周活跃"，范围偏大
4. 推荐任务关键词包含"双足、四足"，搜索任务关键词只有"感知算法、BEV、OCC"；和职位里更直接的"检测、跟踪、融合、多模态、闭环、标定"相比，约束还不够贴岗位
5. 智能筛选标准未设置；列表页没有再做一层岗位贴合度过滤

**【可执行改法（<=5，按优先级 P0/P1...）】**

**P0：改"寻访配置-活跃度"**
- **当前：**推荐任务为"本周内活跃"；搜索任务为"近一周活跃"
- **改成：**先统一收紧为"刚刚活跃"；若人数不足，再放到"在线"
- **预期改善：**直接减少低意向人选进入查看详情，降低整体过筛率，提升有效查看人数

**P1：改"寻访配置-曾任职位"**
- **当前：**缺失
- **改成：**新增"感知、视觉"
- **预期改善：**先在列表页卡掉非感知主线人选，减少无关简历进入查看详情

**P2：改"寻访配置-关键词过滤"**
- **当前：**推荐任务为"BEV 或 OCC 或数据闭环或感知算法或双足或四足"；搜索任务为"感知算法或 BEV 或 OCC"
- **改成：**推荐任务和搜索任务统一收紧为"感知@@检测@@跟踪@@融合@@闭环@@标定@@多模态"
- **预期改善：**把关键词从行业词收紧到岗位技能词，降低过筛率，提升查看后命中率

**P3：改"寻访配置-工作经验"**
- **当前：**1-20 年
- **改成：**3-5 年
- **预期改善：**贴近岗位要求，减少明显不匹配的人进入查看详情

**P4：改"寻访配置-智能筛选标准"**
- **当前：**缺失
- **改成：**新增"优先通过有人形机器人或智能驾驶感知算法落地经验，且做过检测、跟踪、融合、闭环、标定、多模态相关工作的人选"
- **预期改善：**在列表页再加一道岗位贴合过滤，继续压低过筛率，减少查看资源浪费`

export function buildStrategyTemplateSuggestionCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: {
        tag: "plain_text",
        content: `【${MOCK_STRATEGY_TEMPLATE_SUGGESTION_POSITION}】寻聘策略修改建议`,
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
