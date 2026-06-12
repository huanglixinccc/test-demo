import { describe, it, expect, vi } from "vitest"
import type { AIProvider } from "../../src/ai/provider.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import {
  answerDashboardQuestion,
  buildDashboardContext,
  ChatValidationError,
} from "../../src/api/dashboard/chat.js"

function mockBitable(overrides: Partial<BitableTables> = {}): BitableTables {
  return {
    listAllCandidates: vi.fn().mockResolvedValue([
      {
        record_id: "rec_c1",
        fields: {
          candidateId: "c1",
          name: "张三",
          position: "前端工程师",
          status: "技术面",
          resumeSource: "Boss",
          createdAt: new Date("2026-06-01T10:00:00+08:00").getTime(),
        },
      },
    ]),
    listAllInterviews: vi.fn().mockResolvedValue([
      {
        record_id: "rec_iv1",
        fields: {
          candidateName: "张三",
          interviewerName: "李四",
          interviewTime: new Date("2026-06-15T14:00:00+08:00").getTime(),
          interviewStatus: "待面试",
        },
      },
      {
        record_id: "rec_iv2",
        fields: {
          candidateName: "赵六",
          interviewerName: "王五",
          interviewTime: new Date("2026-06-14T10:00:00+08:00").getTime(),
          interviewStatus: "已完成",
          exceptionType: "候选人爽约",
          exceptionStatus: "待处理",
          exceptionNote: "未到场",
        },
      },
    ]),
    listAllReferrals: vi.fn().mockResolvedValue([
      {
        record_id: "rec_ref1",
        fields: {
          candidateId: "c1",
          candidateName: "张三",
          referrerName: "王五",
          referrerOpenId: "ou_ref",
          referralTime: new Date("2026-05-28T09:00:00+08:00").getTime(),
          currentStatus: "技术面",
        },
      },
    ]),
    ...overrides,
  } as unknown as BitableTables
}

describe("dashboard chat", () => {
  it("buildDashboardContext aggregates bitable data", async () => {
    const ctx = await buildDashboardContext(mockBitable())
    expect(ctx.candidateCount).toBe(1)
    expect(ctx.interviewCount).toBe(2)
    expect(ctx.referralCount).toBe(1)
    expect(ctx.candidates[0]?.name).toBe("张三")
    expect(ctx.funnel.resume).toBe(1)
    expect(ctx.interviewExceptions.pendingCount).toBe(1)
    expect(ctx.interviewExceptions.byType["候选人爽约"]).toBe(1)
    expect(ctx.interviewExceptions.pending[0]?.candidateName).toBe("赵六")
    expect(ctx.interviews[1]?.exceptionType).toBe("候选人爽约")
  })

  it("answerDashboardQuestion includes exception data in snapshot", async () => {
    const ai: AIProvider = {
      chat: vi.fn().mockResolvedValue("赵六爽约待处理。"),
      chatStream: vi.fn(),
    }
    const bitable = mockBitable()

    await answerDashboardQuestion(ai, bitable, "有哪些候选人爽约了？", [])
    const messages = vi.mocked(ai.chat).mock.calls[0]?.[0] ?? []
    const snapshot = messages.find((m) => m.content.includes("数据快照"))?.content ?? ""
    expect(snapshot).toContain("候选人爽约")
    expect(snapshot).toContain("interviewExceptions")
  })

  it("answerDashboardQuestion calls AI with context", async () => {
    const ai: AIProvider = {
      chat: vi.fn().mockResolvedValue("当前有 1 位候选人处于技术面。"),
      chatStream: vi.fn().mockImplementation(async function* () {
        yield "当前有 1 位候选人处于技术面。"
      }),
    }
    const bitable = mockBitable()

    const answer = await answerDashboardQuestion(ai, bitable, "技术面有几个人？", [])
    expect(answer).toContain("技术面")
    expect(ai.chat).toHaveBeenCalled()
    const messages = vi.mocked(ai.chat).mock.calls[0]?.[0] ?? []
    expect(messages.some((m) => m.content.includes("数据快照"))).toBe(true)
    expect(messages.some((m) => m.content === "技术面有几个人？")).toBe(true)
  })

  it("rejects empty message", async () => {
    const ai: AIProvider = { chat: vi.fn() }
    await expect(answerDashboardQuestion(ai, mockBitable(), "  ", [])).rejects.toThrow(
      ChatValidationError,
    )
  })
})
