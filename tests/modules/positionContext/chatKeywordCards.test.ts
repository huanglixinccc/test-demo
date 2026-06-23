import { describe, it, expect } from "vitest"
import {
  buildLowGreetingCard,
  buildManualRejectionReasonAnalysisCard,
  buildRecruitmentDataCard,
  buildRejectionReasonAnalysisCard,
  buildSearchStrategyTemplateCard,
  buildStrategyTemplateSuggestionCard,
  buildTaskClosedCard,
  buildTodayDataCard,
  MOCK_MANUAL_REJECTION_REASONS,
  MOCK_RECRUITMENT_DATA,
  MOCK_REJECTION_REASONS,
  TASK_CLOSED_LINKS,
} from "../../../src/modules/positionContext/chatKeywordCards.js"

describe("chat keyword cards", () => {
  it("builds recruitment data card with mock metrics", () => {
    const card = buildRecruitmentDataCard()
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe("【HRBP】今日寻聘数据")
    expect(serialized).toContain(`**日期：**${MOCK_RECRUITMENT_DATA.date}`)
    expect(serialized).toContain(`**打开详情数：**${MOCK_RECRUITMENT_DATA.detailOpens}`)
    expect(serialized).toContain(`**招呼数：**${MOCK_RECRUITMENT_DATA.greetings}`)
    expect(serialized).toContain(`**追聊数：**${MOCK_RECRUITMENT_DATA.followUps}`)
    expect(serialized).toContain(`**回复数：**${MOCK_RECRUITMENT_DATA.replies}`)
    expect(serialized).toContain(`**索要数：**${MOCK_RECRUITMENT_DATA.resumeRequests}`)
    expect(serialized).toContain(`**联系方式数：**${MOCK_RECRUITMENT_DATA.contacts}`)
  })

  it("builds strategy template suggestion card with updated demo copy", () => {
    const card = buildStrategyTemplateSuggestionCard()
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe("【HRBP】寻聘策略修改建议")
    expect(serialized).toContain("区分度不够")
    expect(serialized).toContain("**支撑这个判断的关键数据有 4 个：**")
    expect(serialized).toContain("**1. 前段执行量并不低**")
    expect(serialized).toContain("**【关键证据】**")
    expect(serialized).toContain("**P0：改")
    expect(serialized).toContain("感知算法、BEV、OCC")
  })

  it("builds markdown reply cards for private chat keywords", () => {
    const lowGreeting = buildLowGreetingCard()
    expect(lowGreeting.header.title.content).toBe("【HRBP】招呼数分析")
    expect(JSON.stringify(lowGreeting)).toContain("**建议按优先级做这几件事：**")

    const todayData = buildTodayDataCard()
    expect(todayData.header.title.content).toBe("【HRBP】今日寻聘数据")
    expect(JSON.stringify(todayData)).toContain("**日期：**2026/06/21")
  })

  it("builds task closed card with link buttons", () => {
    const card = buildTaskClosedCard()
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe("【HRBP】寻聘任务已关闭")
    for (const link of TASK_CLOSED_LINKS) {
      expect(serialized).toContain(link.label)
      expect(serialized).toContain(link.message)
    }
  })

  it("builds manual rejection reason analysis card with mock stats", () => {
    const card = buildManualRejectionReasonAnalysisCard()
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe("【机器学习平台研发工程师】人工淘汰理由分析")
    for (const line of MOCK_MANUAL_REJECTION_REASONS) {
      expect(serialized).toContain(line)
    }
  })

  it("builds rejection reason analysis card with mock stats", () => {
    const card = buildRejectionReasonAnalysisCard()
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe("【HRBP】淘汰理由分析")
    for (const line of MOCK_REJECTION_REASONS) {
      expect(serialized).toContain(line)
    }
  })

  it("builds search strategy template card with full demo copy", () => {
    const card = buildSearchStrategyTemplateCard()
    const serialized = JSON.stringify(card)

    expect(serialized).toContain("**寻访任务：**")
    expect(serialized).toContain("1.推荐任务：每次刷列表人数300")
    expect(serialized).toContain("**匹配要求：**")
    expect(serialized).toContain("**筛选标准：**")
    expect(serialized).toContain("最近3段工作经历时长之和大于6年")
  })
})
