export function isRecruitmentDataIntent(text: string): boolean {
  return text.includes("寻聘数据")
}

export function isSearchStrategyIntent(text: string): boolean {
  if (isStrategyTemplateSuggestionIntent(text)) return false
  return (
    text.includes("寻访策略") ||
    text.includes("策略模板") ||
    text.includes("寻聘策略")
  )
}

export function isStrategyTemplateSuggestionIntent(text: string): boolean {
  return (
    text.includes("寻聘策略修改建议") ||
    text.includes("修改策略模板建议") ||
    text.includes("策略模板建议") ||
    text.includes("修改建议")
  )
}

export function isLowGreetingIntent(text: string): boolean {
  return text.includes("招呼数太少")
}

export function isTodayProgressIntent(text: string): boolean {
  return text.includes("查询今天执行进展")
}

export function isTodayDataIntent(text: string): boolean {
  return text.includes("查看今日数据")
}

export function isPendingCandidatesIntent(text: string): boolean {
  return text.includes("今日待处理候选人") || text.includes("查看待处理人员")
}

export function isRecruitmentModelIntent(text: string): boolean {
  return text.includes("查看寻聘模型")
}

export function isTaskClosedIntent(text: string): boolean {
  return /结束|暂停|关闭|停止/.test(text)
}

export function isRejectionReasonIntent(text: string): boolean {
  if (text.includes("人工淘汰")) return false
  return text.includes("淘汰理由") || text.includes("淘汰")
}

export function isManualRejectionIntent(text: string): boolean {
  return text.includes("人工淘汰")
}

export function isClarificationIntent(text: string): boolean {
  return text.includes("开始澄清") || text.includes("职位澄清")
}

export function isStartRecruitmentTaskIntent(text: string): boolean {
  if (isClarificationIntent(text)) return false
  return /开始|继续|开启/.test(text)
}
