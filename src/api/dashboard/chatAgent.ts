import type { AIProvider } from "../../ai/provider.js"
import type { BitableTables } from "../../feishu/bitable.js"
import type { FeishuVC } from "../../feishu/vc.js"
import {
  answerDashboardQuestion,
  streamDashboardQuestion,
  ChatValidationError,
  type DashboardChatHistoryItem,
} from "./chat.js"
import {
  TOOL_ROUTER_SYSTEM_PROMPT,
  parseToolIntentJson,
  executeCreateMeeting,
  formatCreateMeetingReply,
  ChatToolError,
} from "./chatTools.js"

export async function detectToolIntent(
  ai: AIProvider,
  message: string,
  history: DashboardChatHistoryItem[] = [],
): Promise<ReturnType<typeof parseToolIntentJson>> {
  const prior = history
    .slice(-6)
    .filter((m) => m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim() }))

  const raw = await ai.chat(
    [
      { role: "system", content: TOOL_ROUTER_SYSTEM_PROMPT },
      ...prior,
      { role: "user", content: message.trim() },
    ],
    { temperature: 0, maxTokens: 512 },
  )

  return parseToolIntentJson(raw)
}

export async function* streamDashboardAgent(
  ai: AIProvider,
  bitable: BitableTables,
  vc: FeishuVC,
  meetingOwnerFallback: string,
  message: string,
  history: DashboardChatHistoryItem[] = [],
): AsyncGenerator<string> {
  const trimmed = message.trim()
  if (!trimmed) throw new ChatValidationError("请输入问题")

  const intent = await detectToolIntent(ai, trimmed, history)

  if (intent.tool === "create_meeting") {
    yield "正在根据您提供的信息创建会议链接…\n\n"
    try {
      const result = await executeCreateMeeting(
        bitable,
        vc,
        meetingOwnerFallback,
        intent.args,
      )
      yield formatCreateMeetingReply(result)
    } catch (err) {
      const msg =
        err instanceof ChatToolError || err instanceof Error
          ? err.message
          : "创建会议失败"
      yield `无法创建会议链接：**${msg}**\n\n`
      yield "提示：请说明候选人姓名；面试记录需有面试时间、面试官姓名及面试官 open_id（可在看板详情中先填写）。"
    }
    return
  }

  yield* streamDashboardQuestion(ai, bitable, trimmed, history)
}

export async function answerDashboardAgent(
  ai: AIProvider,
  bitable: BitableTables,
  vc: FeishuVC,
  meetingOwnerFallback: string,
  message: string,
  history: DashboardChatHistoryItem[] = [],
): Promise<string> {
  const trimmed = message.trim()
  if (!trimmed) throw new ChatValidationError("请输入问题")

  const intent = await detectToolIntent(ai, trimmed, history)

  if (intent.tool === "create_meeting") {
    try {
      const result = await executeCreateMeeting(
        bitable,
        vc,
        meetingOwnerFallback,
        intent.args,
      )
      return formatCreateMeetingReply(result)
    } catch (err) {
      const msg =
        err instanceof ChatToolError || err instanceof Error
          ? err.message
          : "创建会议失败"
      return `无法创建会议链接：**${msg}**\n\n提示：请说明候选人姓名；面试记录需有面试时间、面试官姓名及面试官 open_id。`
    }
  }

  return answerDashboardQuestion(ai, bitable, trimmed, history)
}
