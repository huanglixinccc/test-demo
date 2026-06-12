import type { AIProvider, ChatMessage } from "../../ai/provider.js"
import type { BitableTables } from "../../feishu/bitable.js"
import { computeFunnel } from "../../agents/analytics/funnel.js"
import {
  normalizeBitableFieldValue,
  normalizeBitableTimestamp,
} from "../../feishu/bitableFields.js"

const SYSTEM_PROMPT = `你是招聘数据智能助手，根据用户提供的飞书多维表格数据快照回答问题。

规则：
1. 只依据数据快照中的事实回答，不要编造候选人、面试或内推记录。
2. 若数据不足以回答，明确说明缺少什么信息，并给出可查询的替代问法。
3. 涉及人数、漏斗、状态时给出具体数字；列举候选人时简明列出姓名、岗位、状态。
4. 时间统一用北京时间（UTC+8）可读格式。
5. 回答使用中文，条理清晰，使用 Markdown 格式（列表、加粗等）。
6. 面试异常：interviews 中 exceptionType 为异常类型（候选人爽约、面试官取消、面评超时等），exceptionStatus 为处理状态；interviewExceptions 汇总待处理异常，优先用于回答爽约/取消/超时类问题。
7. 创建会议链接等写操作由系统工具处理，你只需回答查询类问题；若用户要创建会议，引导其在消息中写明候选人、面试官等信息。`

export interface DashboardChatHistoryItem {
  role: "user" | "assistant"
  content: string
}

export interface DashboardChatContext {
  generatedAt: string
  funnel: ReturnType<typeof computeFunnel>
  statusBreakdown: Record<string, number>
  positions: string[]
  candidateCount: number
  interviewCount: number
  referralCount: number
  candidates: Array<{
    name: string | null
    position: string | null
    status: string
    matchScore: number | null
    priority: string | null
    rejectReason: string | null
    resumeSource: string
    createdAt: string | null
  }>
  interviewExceptions: {
    pendingCount: number
    byType: Record<string, number>
    pending: Array<{
      candidateName: string | null
      interviewerName: string | null
      interviewTime: string | null
      exceptionType: string
      exceptionNote: string | null
    }>
  }
  interviews: Array<{
    candidateName: string | null
    interviewerName: string | null
    interviewTime: string | null
    interviewStatus: string | null
    reviewResult: string | null
    reviewContent: string | null
    exceptionType: string | null
    exceptionStatus: string | null
    exceptionNote: string | null
  }>
  referrals: Array<{
    candidateName: string
    referrerName: string
    referralTime: string | null
    currentStatus: string
  }>
}

function formatTs(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null
  return new Date(ms).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
}

export async function buildDashboardContext(bitable: BitableTables): Promise<DashboardChatContext> {
  const [candidates, interviews, referrals] = await Promise.all([
    bitable.listAllCandidates(),
    bitable.listAllInterviews(),
    bitable.listAllReferrals(),
  ])

  const statusBreakdown: Record<string, number> = {}
  const positionSet = new Set<string>()

  for (const r of candidates) {
    const status = normalizeBitableFieldValue(r.fields.status) ?? "未知"
    statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1
    const pos = normalizeBitableFieldValue(r.fields.position)
    if (pos) positionSet.add(pos)
  }

  const interviewRows = interviews.map((r) => ({
    candidateName: normalizeBitableFieldValue(r.fields.candidateName),
    interviewerName: normalizeBitableFieldValue(r.fields.interviewerName),
    interviewTime: formatTs(r.fields.interviewTime),
    interviewStatus: normalizeBitableFieldValue(r.fields.interviewStatus),
    reviewResult: normalizeBitableFieldValue(r.fields.reviewResult),
    reviewContent: normalizeBitableFieldValue(r.fields.reviewContent) || null,
    exceptionType: normalizeBitableFieldValue(r.fields.exceptionType) ?? null,
    exceptionStatus: normalizeBitableFieldValue(r.fields.exceptionStatus) ?? null,
    exceptionNote: normalizeBitableFieldValue(r.fields.exceptionNote) ?? null,
  }))

  const byType: Record<string, number> = {}
  const pending: DashboardChatContext["interviewExceptions"]["pending"] = []
  for (const row of interviewRows) {
    if (!row.exceptionType) continue
    byType[row.exceptionType] = (byType[row.exceptionType] ?? 0) + 1
    if (row.exceptionStatus === "待处理") {
      pending.push({
        candidateName: row.candidateName,
        interviewerName: row.interviewerName,
        interviewTime: row.interviewTime,
        exceptionType: row.exceptionType,
        exceptionNote: row.exceptionNote,
      })
    }
  }

  return {
    generatedAt: formatTs(Date.now()) ?? "",
    funnel: computeFunnel(candidates),
    statusBreakdown,
    positions: [...positionSet].sort(),
    candidateCount: candidates.length,
    interviewCount: interviews.length,
    referralCount: referrals.length,
    candidates: candidates.map((r) => ({
      name: normalizeBitableFieldValue(r.fields.name),
      position: normalizeBitableFieldValue(r.fields.position),
      status: normalizeBitableFieldValue(r.fields.status) ?? "未知",
      matchScore: r.fields.matchScore ?? null,
      priority: (r.fields.priority as string | null) ?? null,
      rejectReason: normalizeBitableFieldValue(r.fields.rejectReason),
      resumeSource: normalizeBitableFieldValue(r.fields.resumeSource) ?? "",
      createdAt: formatTs(
        normalizeBitableTimestamp(r.fields.createdAt) ??
          normalizeBitableTimestamp(r.created_time),
      ),
    })),
    interviewExceptions: {
      pendingCount: pending.length,
      byType,
      pending,
    },
    interviews: interviewRows,
    referrals: referrals.map((r) => ({
      candidateName: normalizeBitableFieldValue(r.fields.candidateName) ?? "",
      referrerName: normalizeBitableFieldValue(r.fields.referrerName) ?? "",
      referralTime: formatTs(
        normalizeBitableTimestamp(r.fields.referralTime) ??
          normalizeBitableTimestamp(r.created_time),
      ),
      currentStatus: normalizeBitableFieldValue(r.fields.currentStatus) ?? "",
    })),
  }
}

const MAX_HISTORY = 10
const MAX_MESSAGE_LEN = 2000

function validateMessage(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) throw new ChatValidationError("请输入问题")
  if (trimmed.length > MAX_MESSAGE_LEN) {
    throw new ChatValidationError(`问题过长，请控制在 ${MAX_MESSAGE_LEN} 字以内`)
  }
  return trimmed
}

async function buildChatMessages(
  bitable: BitableTables,
  message: string,
  history: DashboardChatHistoryItem[] = [],
): Promise<ChatMessage[]> {
  const trimmed = validateMessage(message)
  const context = await buildDashboardContext(bitable)
  const contextJson = JSON.stringify(context)

  const prior: ChatMessage[] = history
    .slice(-MAX_HISTORY)
    .filter((m) => m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim() }))
  if (
    prior.length > 0 &&
    prior[prior.length - 1]!.role === "user" &&
    prior[prior.length - 1]!.content === trimmed
  ) {
    prior.pop()
  }

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: `数据快照（JSON）：\n${contextJson}` },
    ...prior,
    { role: "user", content: trimmed },
  ]
}

export async function answerDashboardQuestion(
  ai: AIProvider,
  bitable: BitableTables,
  message: string,
  history: DashboardChatHistoryItem[] = [],
): Promise<string> {
  const messages = await buildChatMessages(bitable, message, history)
  return ai.chat(messages, { temperature: 0.3, maxTokens: 2048 })
}

export async function* streamDashboardQuestion(
  ai: AIProvider,
  bitable: BitableTables,
  message: string,
  history: DashboardChatHistoryItem[] = [],
): AsyncGenerator<string> {
  const messages = await buildChatMessages(bitable, message, history)
  const opts = { temperature: 0.3, maxTokens: 2048 }
  if (ai.chatStream) {
    yield* ai.chatStream(messages, opts)
    return
  }
  yield await ai.chat(messages, opts)
}

export class ChatValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ChatValidationError"
  }
}
