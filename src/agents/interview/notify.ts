export function formatInterviewTime(ts: number, timeZone = "Asia/Shanghai"): string {
  // Feishu stores 日期字段 as ms epoch (UTC). Format in user-facing local time
  // explicitly; otherwise toISOString() returns UTC and confuses non-UTC users.
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ts))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`
}

export function buildInterviewNotifyCard(opts: {
  candidateName: string
  interviewerName: string
  interviewTime: number
  recordId: string
}) {
  const when = formatInterviewTime(opts.interviewTime)
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: "新的面试安排" },
    },
    elements: [
      {
        tag: "div",
        fields: [
          { is_short: true, text: { tag: "lark_md", content: `**候选人**\n${opts.candidateName || "-"}` } },
          { is_short: true, text: { tag: "lark_md", content: `**面试时间**\n${when}` } },
          {
            is_short: false,
            text: {
              tag: "lark_md",
              content: `请准时参加，结束后在多维表格 Interview 表填写面评（recordId=${opts.recordId}）`,
            },
          },
        ],
      },
    ],
  }
}

export function buildReviewReminderText(candidateName: string): string {
  return `面试已结束，请尽快在多维表格 Interview 表填写面评：候选人 ${candidateName}`
}

export function buildAttendanceCheckText(opts: {
  candidateName: string
  interviewTime: string
}): string {
  return (
    `【到场确认】候选人 ${opts.candidateName} 的面试（${opts.interviewTime}）已过预约时间。\n` +
    `请确认：1) 候选人是否到场  2) 面试是否已完成\n` +
    `若已完成请尽快填写面评；若候选人爽约无需操作，系统将在稍后通知 HR。`
  )
}

export function buildHrNoShowText(opts: {
  candidateName: string
  interviewTime: string
  recordId: string
}): string {
  return (
    `【疑似爽约 · 待处理】候选人 ${opts.candidateName} | 面试时间 ${opts.interviewTime}\n` +
    `面试官未确认到场且未画面评，请在多维表格 Interview 表处理（recordId=${opts.recordId}）`
  )
}

export function buildHrReviewOverdueText(opts: {
  candidateName: string
  interviewTime: string
  interviewerName: string
  recordId: string
}): string {
  return (
    `【面评超时 · 待处理】候选人 ${opts.candidateName} | ${opts.interviewTime} | 面试官 ${opts.interviewerName}\n` +
    `面试结束超过 24 小时仍未填写面评，请跟进（recordId=${opts.recordId}）`
  )
}

export function buildHrSummaryText(opts: {
  candidateName: string
  reviewerName: string
  reviewResult: string
  nextStatus: string
}): string {
  return `【面评结果】候选人 ${opts.candidateName} | 面试官 ${opts.reviewerName} | 结果 ${opts.reviewResult} | 新状态 ${opts.nextStatus}`
}
