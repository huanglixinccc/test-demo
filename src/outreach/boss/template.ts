export interface BossDraftMessageInput {
  candidateName: string | null
  position: string | null
  interviewTime?: number
  interviewerName?: string | null
  meetingUrl?: string | null
}

export function buildBossInterviewDraftMessage(input: BossDraftMessageInput): string {
  const timeStr =
    input.interviewTime != null && Number.isFinite(input.interviewTime)
      ? new Date(input.interviewTime).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
      : "（时间待定）"

  const greeting = input.candidateName?.trim() ? `您好 ${input.candidateName.trim()}，` : "您好，"
  const lines = [
    greeting,
    "",
    `感谢关注我们的${input.position?.trim() || "岗位"}职位，现邀请您参加面试：`,
    `· 时间：${timeStr}`,
  ]

  if (input.interviewerName?.trim()) {
    lines.push(`· 面试官：${input.interviewerName.trim()}`)
  }
  if (input.meetingUrl?.trim()) {
    lines.push(`· 会议链接：${input.meetingUrl.trim()}`)
  }

  lines.push("", "请确认是否能够参加，谢谢！")
  return lines.join("\n")
}

export function isBossResumeSource(source: string | null | undefined): boolean {
  if (!source?.trim()) return false
  const s = source.trim().toLowerCase()
  return s === "boss直聘" || s === "boss" || s.includes("boss")
}
