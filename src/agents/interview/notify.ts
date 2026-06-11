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
  return `面试已结束，请尽快在多维表格中填写面评：候选人 ${candidateName}`
}

export function buildHrSummaryText(opts: {
  candidateName: string
  reviewerName: string
  reviewResult: string
  nextStatus: string
}): string {
  return `【面评结果】候选人 ${opts.candidateName} | 面试官 ${opts.reviewerName} | 结果 ${opts.reviewResult} | 新状态 ${opts.nextStatus}`
}
