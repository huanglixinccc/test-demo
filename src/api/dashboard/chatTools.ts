import type { BitableTables, BitableRecord, InterviewFields } from "../../feishu/bitable.js"
import type { FeishuVC } from "../../feishu/vc.js"
import {
  normalizeBitableFieldValue,
  normalizeBitableTimestamp,
} from "../../feishu/bitableFields.js"
import {
  createInterviewMeeting,
  isInterviewCompleted,
  MeetingValidationError,
  updateInterviewFields,
} from "./handlers.js"
import type { MeetingLinkResponse } from "./types.js"

export class ChatToolError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ChatToolError"
  }
}

export type ChatToolName = "none" | "create_meeting"

export interface CreateMeetingToolArgs {
  candidateName: string
  interviewerName?: string | null
  interviewerOpenId?: string | null
  interviewTime?: string | null
  topic?: string | null
}

export type ToolIntent =
  | { tool: "none" }
  | { tool: "create_meeting"; args: CreateMeetingToolArgs }

export function parseToolIntentJson(raw: string): ToolIntent {
  const trimmed = raw.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { tool: "none" }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      tool?: string
      candidateName?: string
      interviewerName?: string | null
      interviewerOpenId?: string | null
      interviewTime?: string | null
      topic?: string | null
    }

    if (parsed.tool !== "create_meeting") return { tool: "none" }

    const candidateName = parsed.candidateName?.trim()
    if (!candidateName) return { tool: "none" }

    return {
      tool: "create_meeting",
      args: {
        candidateName,
        interviewerName: parsed.interviewerName?.trim() || null,
        interviewerOpenId: parsed.interviewerOpenId?.trim() || null,
        interviewTime: parsed.interviewTime?.trim() || null,
        topic: parsed.topic?.trim() || null,
      },
    }
  } catch {
    return { tool: "none" }
  }
}

export const TOOL_ROUTER_SYSTEM_PROMPT = `你是招聘助手的意图路由器。根据用户最新消息判断是否请求「创建飞书面试会议链接」。

若用户想创建/生成会议链接、预约视频会议、安排面试会议等，返回 JSON（只返回 JSON，不要其它文字）：
{
  "tool": "create_meeting",
  "candidateName": "候选人姓名（必填）",
  "interviewerName": "面试官姓名或 null",
  "interviewerOpenId": "面试官飞书 open_id 或 null",
  "interviewTime": "面试时间 ISO8601 或中文可解析时间或 null",
  "topic": "会议标题，用户指定则用，否则 null"
}

示例：
- "给张三创建会议链接，面试官李四" → {"tool":"create_meeting","candidateName":"张三","interviewerName":"李四","interviewerOpenId":null,"interviewTime":null,"topic":null}
- "帮王五约个面试会，标题：前端二面，时间明天下午3点" → 提取姓名/标题/时间

若只是查询数据、统计、问答，返回：{"tool":"none"}`

function nameMatches(query: string, name: string | null | undefined): boolean {
  const q = query.trim().toLowerCase()
  const n = (name ?? "").trim().toLowerCase()
  if (!q || !n) return false
  return n.includes(q) || q.includes(n)
}

function parseInterviewTimeMs(raw: string | null | undefined): number | undefined {
  if (!raw?.trim()) return undefined
  const ms = new Date(raw.trim()).getTime()
  return Number.isFinite(ms) && ms > 0 ? ms : undefined
}

export async function findInterviewForMeeting(
  bitable: BitableTables,
  args: CreateMeetingToolArgs,
): Promise<BitableRecord<InterviewFields>> {
  const q = args.candidateName.trim()
  let rows: BitableRecord<InterviewFields>[] = []

  const all = await bitable.listAllInterviews()
  rows = all.filter((r) => {
    const status = normalizeBitableFieldValue(r.fields.interviewStatus)
    if (isInterviewCompleted(status)) return false
    return nameMatches(q, normalizeBitableFieldValue(r.fields.candidateName))
  })

  if (rows.length === 0) {
    const candidates = await bitable.listAllCandidates()
    const cand = candidates.find((c) => nameMatches(q, normalizeBitableFieldValue(c.fields.name)))
    const candidateId = normalizeBitableFieldValue(cand?.fields.candidateId)
    if (candidateId) {
      const byCand = await bitable.findInterviewsByCandidateId(candidateId)
      rows = byCand.filter((r) => {
        const status = normalizeBitableFieldValue(r.fields.interviewStatus)
        return !isInterviewCompleted(status)
      })
    }
  }

  if (args.interviewerName?.trim()) {
    const filtered = rows.filter((r) =>
      nameMatches(args.interviewerName!, normalizeBitableFieldValue(r.fields.interviewerName)),
    )
    if (filtered.length > 0) rows = filtered
  }

  if (rows.length === 0) {
    throw new ChatToolError(
      `未找到候选人「${args.candidateName}」的可创建会议的面试记录（需非「已完成」状态）`,
    )
  }

  if (rows.length > 1) {
    rows.sort((a, b) => {
      const ta = normalizeBitableTimestamp(a.fields.interviewTime) ?? 0
      const tb = normalizeBitableTimestamp(b.fields.interviewTime) ?? 0
      return tb - ta
    })
  }

  return rows[0]!
}

export async function executeCreateMeeting(
  bitable: BitableTables,
  vc: FeishuVC,
  fallbackOwnerId: string,
  args: CreateMeetingToolArgs,
): Promise<MeetingLinkResponse & { candidateName: string; interviewRecordId: string }> {
  const interview = await findInterviewForMeeting(bitable, args)
  const recordId = interview.record_id

  const patch: {
    interviewTime?: number
    interviewerName?: string
    interviewerOpenId?: string
  } = {}

  const timeMs = parseInterviewTimeMs(args.interviewTime)
  if (timeMs) patch.interviewTime = timeMs
  if (args.interviewerName?.trim()) patch.interviewerName = args.interviewerName.trim()
  if (args.interviewerOpenId?.trim()) patch.interviewerOpenId = args.interviewerOpenId.trim()

  if (Object.keys(patch).length > 0) {
    try {
      await updateInterviewFields(bitable, recordId, patch)
    } catch (err) {
      if (err instanceof MeetingValidationError) {
        throw new ChatToolError(err.message)
      }
      throw err
    }
  }

  try {
    const result = await createInterviewMeeting(bitable, vc, recordId, fallbackOwnerId, {
      topic: args.topic ?? undefined,
    })
    const candidateName =
      normalizeBitableFieldValue(interview.fields.candidateName) ?? args.candidateName
    return { ...result, candidateName, interviewRecordId: recordId }
  } catch (err) {
    if (err instanceof MeetingValidationError) {
      throw new ChatToolError(err.message)
    }
    throw err
  }
}

export function formatCreateMeetingReply(
  result: MeetingLinkResponse & { candidateName: string },
): string {
  const lines = [
    `已为 **${result.candidateName}** ${result.fromCache ? "获取已有" : "创建"}飞书会议链接：`,
    "",
    `- **会议链接**：${result.meeting.url}`,
  ]
  if (result.meeting.meetingNo) {
    lines.push(`- **会议号**：${result.meeting.meetingNo}`)
  }
  if (result.meeting.password) {
    lines.push(`- **密码**：${result.meeting.password}`)
  }
  lines.push("", "**邀请文案**（可复制发送给候选人）：", "", "```", result.clipboardText, "```")
  return lines.join("\n")
}
