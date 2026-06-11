export function buildInterviewNotifyCard(opts: {
  candidateName: string
  interviewerName: string
  interviewTime: number
  recordId: string
}) {
  const when = new Date(opts.interviewTime).toISOString().replace("T", " ").slice(0, 16)
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
