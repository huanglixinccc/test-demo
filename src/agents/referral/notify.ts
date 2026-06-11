import type { ParsedResume } from "../resume/parse.js"

export function buildReferralReplyCard(opts: {
  candidateId: string
  parsed: ParsedResume
}) {
  const { parsed } = opts
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "violet",
      title: { tag: "plain_text", content: "已收到内推" },
    },
    elements: [
      {
        tag: "div",
        fields: [
          { is_short: true, text: { tag: "lark_md", content: `**姓名**\n${parsed.name ?? "-"}` } },
          { is_short: true, text: { tag: "lark_md", content: `**岗位**\n${parsed.position ?? "-"}` } },
          { is_short: true, text: { tag: "lark_md", content: `**手机**\n${parsed.phone ?? "-"}` } },
          { is_short: true, text: { tag: "lark_md", content: `**邮箱**\n${parsed.email ?? "-"}` } },
          {
            is_short: false,
            text: {
              tag: "lark_md",
              content: `**技能**\n${parsed.skills.length ? parsed.skills.join("、") : "-"}`,
            },
          },
          {
            is_short: false,
            text: {
              tag: "lark_md",
              content: `已为您建立内推关系，候选人状态变化会主动通知您。\n**候选人 ID**：${opts.candidateId}`,
            },
          },
        ],
      },
    ],
  }
}

export function buildReferralStatusUpdateText(opts: {
  candidateName: string
  status: string
}): string {
  const { candidateName: n, status: s } = opts
  if (s === "淘汰") return `很遗憾，您推荐的【${n}】在招聘流程中未通过。感谢您的推荐！`
  if (s === "入职") return `🎉 您推荐的【${n}】已成功入职！感谢您的推荐！`
  if (s === "Offer") return `好消息！您推荐的【${n}】已发放 Offer。`
  return `您推荐的【${n}】已进入【${s}】阶段`
}
