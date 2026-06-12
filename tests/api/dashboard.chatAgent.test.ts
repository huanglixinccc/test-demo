import { describe, it, expect, vi } from "vitest"
import type { AIProvider } from "../../src/ai/provider.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuVC } from "../../src/feishu/vc.js"
import { detectToolIntent, answerDashboardAgent } from "../../src/api/dashboard/chatAgent.js"

vi.mock("../../src/api/dashboard/chatTools.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api/dashboard/chatTools.js")>()
  return {
    ...actual,
    executeCreateMeeting: vi.fn().mockResolvedValue({
      candidateName: "张三",
      interviewRecordId: "rec_iv1",
      fromCache: false,
      clipboardText: "会议邀请",
      meeting: { url: "https://meet.example.com", meetingNo: "999", appLink: "https://meet.example.com" },
    }),
  }
})

describe("chatAgent", () => {
  it("detectToolIntent routes create meeting", async () => {
    const ai: AIProvider = {
      chat: vi.fn().mockResolvedValue(
        '{"tool":"create_meeting","candidateName":"张三","interviewerName":"李四"}',
      ),
    }
    const intent = await detectToolIntent(ai, "给张三创建会议链接，面试官李四")
    expect(intent.tool).toBe("create_meeting")
  })

  it("answerDashboardAgent creates meeting when intent matches", async () => {
    const ai: AIProvider = {
      chat: vi.fn().mockResolvedValue(
        '{"tool":"create_meeting","candidateName":"张三","interviewerName":"李四"}',
      ),
    }
    const answer = await answerDashboardAgent(
      ai,
      {} as BitableTables,
      {} as FeishuVC,
      "ou_hr",
      "给张三创建会议链接",
    )
    expect(answer).toContain("张三")
    expect(answer).toContain("https://meet.example.com")
  })
})
