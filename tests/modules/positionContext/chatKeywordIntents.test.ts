import { describe, it, expect } from "vitest"
import {
  isClarificationIntent,
  isLowGreetingIntent,
  isManualRejectionIntent,
  isPendingCandidatesIntent,
  isRecruitmentDataIntent,
  isRecruitmentModelIntent,
  isRejectionReasonIntent,
  isSearchStrategyIntent,
  isStartRecruitmentTaskIntent,
  isStrategyTemplateSuggestionIntent,
  isTaskClosedIntent,
  isTodayDataIntent,
  isTodayProgressIntent,
} from "../../../src/modules/positionContext/chatKeywordIntents.js"

describe("chat keyword intents", () => {
  it("matches recruitment data keyword", () => {
    expect(isRecruitmentDataIntent("看一下今天的寻聘数据")).toBe(true)
    expect(isRecruitmentDataIntent("寻聘数据")).toBe(true)
  })

  it("matches strategy template suggestion keywords", () => {
    expect(isStrategyTemplateSuggestionIntent("修改策略模板建议")).toBe(true)
    expect(isStrategyTemplateSuggestionIntent("策略模板建议")).toBe(true)
    expect(isStrategyTemplateSuggestionIntent("给我修改建议")).toBe(true)
  })

  it("does not treat strategy template suggestion as search strategy", () => {
    expect(isSearchStrategyIntent("策略模板建议")).toBe(false)
    expect(isSearchStrategyIntent("寻聘策略修改建议")).toBe(false)
    expect(isStrategyTemplateSuggestionIntent("寻聘策略修改建议")).toBe(true)
  })

  it("matches new private chat keyword intents", () => {
    expect(isLowGreetingIntent("招呼数太少")).toBe(true)
    expect(isTodayProgressIntent("查询今天执行进展")).toBe(true)
    expect(isTodayDataIntent("查看今日数据")).toBe(true)
    expect(isPendingCandidatesIntent("今日待处理候选人")).toBe(true)
    expect(isPendingCandidatesIntent("查看待处理人员")).toBe(true)
    expect(isRecruitmentModelIntent("查看寻聘模型")).toBe(true)
  })

  it("matches search strategy keywords", () => {
    expect(isSearchStrategyIntent("给我寻访策略")).toBe(true)
    expect(isSearchStrategyIntent("策略模板是什么")).toBe(true)
  })

  it("matches rejection reason keywords", () => {
    expect(isRejectionReasonIntent("看一下淘汰理由分析")).toBe(true)
    expect(isRejectionReasonIntent("最近淘汰情况")).toBe(true)
  })

  it("matches manual rejection keyword", () => {
    expect(isManualRejectionIntent("看一下人工淘汰情况")).toBe(true)
  })

  it("does not treat 人工淘汰 as general rejection intent", () => {
    expect(isRejectionReasonIntent("人工淘汰分析")).toBe(false)
    expect(isManualRejectionIntent("人工淘汰分析")).toBe(true)
  })

  it("matches task closed keywords", () => {
    expect(isTaskClosedIntent("结束寻聘")).toBe(true)
    expect(isTaskClosedIntent("暂停任务")).toBe(true)
    expect(isTaskClosedIntent("关闭")).toBe(true)
    expect(isTaskClosedIntent("停止")).toBe(true)
  })

  it("matches clarification keywords", () => {
    expect(isClarificationIntent("开始澄清")).toBe(true)
    expect(isClarificationIntent("职位澄清一下")).toBe(true)
  })

  it("matches start recruitment task keywords", () => {
    expect(isStartRecruitmentTaskIntent("开始寻聘")).toBe(true)
    expect(isStartRecruitmentTaskIntent("继续执行")).toBe(true)
    expect(isStartRecruitmentTaskIntent("开启任务")).toBe(true)
  })

  it("does not treat clarification as start recruitment task", () => {
    expect(isStartRecruitmentTaskIntent("开始澄清")).toBe(false)
    expect(isStartRecruitmentTaskIntent("职位澄清")).toBe(false)
  })

  it("does not match unrelated text", () => {
    expect(isRecruitmentDataIntent("随便聊聊")).toBe(false)
    expect(isSearchStrategyIntent("随便聊聊")).toBe(false)
    expect(isRejectionReasonIntent("随便聊聊")).toBe(false)
    expect(isManualRejectionIntent("随便聊聊")).toBe(false)
    expect(isTaskClosedIntent("随便聊聊")).toBe(false)
    expect(isStrategyTemplateSuggestionIntent("随便聊聊")).toBe(false)
    expect(isClarificationIntent("随便聊聊")).toBe(false)
    expect(isStartRecruitmentTaskIntent("随便聊聊")).toBe(false)
  })
})
