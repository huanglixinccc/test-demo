import { v4 as uuid } from "uuid"
import type { AIProvider } from "../../ai/provider.js"
import type { BitableTables } from "../../feishu/bitable.js"
import type { FeishuIM } from "../../feishu/im.js"
import { bus } from "../../events/bus.js"
import { parseResume, hasAnyKeyField, type ParsedResume } from "./parse.js"
import { logger } from "../../utils/logger.js"

export interface ResumeAgentDeps {
  ai: AIProvider
  bitable: BitableTables
  im: FeishuIM
}

export function registerResumeAgent(deps: ResumeAgentDeps): void {
  bus.on("ResumeReceived", async (payload) => {
    let parsed: ParsedResume
    try {
      parsed = await parseResume(deps.ai, payload.text)
    } catch (err) {
      logger.error({ err }, "resumeAgent.parse_failed")
      await deps.im.sendTextToUser(
        payload.senderOpenId,
        "解析失败，请粘贴更完整的简历文本或换一份",
      )
      return
    }

    if (!hasAnyKeyField(parsed)) {
      await deps.im.sendTextToUser(
        payload.senderOpenId,
        "未识别到候选人姓名/联系方式，请检查内容",
      )
      return
    }

    const candidateId = uuid()
    let createdRecord
    try {
      createdRecord = await deps.bitable.createCandidate({
        candidateId,
        name: parsed.name,
        position: parsed.position,
        phone: parsed.phone,
        email: parsed.email,
        skills: parsed.skills,
        resumeSource: "飞书机器人",
        status: "待筛选",
        createdAt: Date.now(),
      })
    } catch (err) {
      logger.error({ err }, "resumeAgent.bitable_failed")
      await deps.im.sendTextToUser(payload.senderOpenId, "写入失败，请联系管理员")
      return
    }

    bus.emit("CandidateCreated", {
      candidateRecordId: createdRecord.record_id,
      candidateId,
      name: parsed.name,
      position: parsed.position,
      skills: parsed.skills,
    })

    const card = buildResumeReplyCard({ candidateId, parsed })
    try {
      await deps.im.sendCardToUser(payload.senderOpenId, card)
    } catch {
      await deps.im.sendTextToUser(
        payload.senderOpenId,
        `已写入候选人库：${parsed.name ?? "(无名)"} / ${parsed.position ?? "(未填岗位)"}`,
      )
    }
  })
}

export function buildResumeReplyCard(opts: {
  candidateId: string
  parsed: ParsedResume
}) {
  const { parsed } = opts
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "green",
      title: { tag: "plain_text", content: "候选人已入库" },
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
            text: { tag: "lark_md", content: `**候选人 ID**\n${opts.candidateId}` },
          },
        ],
      },
    ],
  }
}
