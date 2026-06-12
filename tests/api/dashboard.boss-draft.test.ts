import { describe, it, expect, vi, beforeEach } from "vitest"
import type { BitableTables } from "../../src/feishu/bitable.js"
import { prepareBossInterviewDraft } from "../../src/api/dashboard/handlers.js"
import { BossDraftError } from "../../src/outreach/boss/index.js"

vi.mock("../../src/outreach/boss/fillDraft.js", () => ({
  fillBossChatDraft: vi.fn().mockResolvedValue({
    filled: true,
    chatUrl: "https://www.zhipin.com/web/geek/chat?id=1",
    message: "draft",
    inputSelector: "textarea",
  }),
}))

function mockBitable(): BitableTables {
  return {
    getInterview: vi.fn().mockResolvedValue({
      record_id: "rec_iv",
      fields: {
        candidateId: "c1",
        candidateName: "张三",
        interviewerName: "李四",
        interviewTime: new Date("2026-06-15T14:00:00+08:00").getTime(),
        meetingUrl: "https://meet.example.com/x",
      },
    }),
    findCandidateByCandidateId: vi.fn().mockResolvedValue({
      record_id: "rec_c",
      fields: {
        candidateId: "c1",
        name: "张三",
        position: "前端工程师",
        resumeSource: "Boss直聘",
        platformChatUrl: "https://www.zhipin.com/web/geek/chat?id=1",
      },
    }),
  } as unknown as BitableTables
}

describe("prepareBossInterviewDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fills boss draft for boss candidate", async () => {
    const result = await prepareBossInterviewDraft(mockBitable(), "rec_iv", {
      profileDir: ".boss-test-profile",
      cdpPort: 9222,
    })
    expect(result.status).toBe("filled")
    expect(result.draftText).toContain("张三")
    expect(result.chatUrl).toContain("zhipin.com")
    expect(result.message).toContain("不会自动发送")
  })

  it("rejects non-boss source", async () => {
    const bitable = mockBitable()
    vi.mocked(bitable.findCandidateByCandidateId).mockResolvedValue({
      record_id: "rec_c",
      fields: {
        candidateId: "c1",
        resumeSource: "猎聘",
        platformChatUrl: "https://www.zhipin.com/web/geek/chat?id=1",
      },
    } as never)

    await expect(
      prepareBossInterviewDraft(bitable, "rec_iv", {
        profileDir: ".boss-test-profile",
        cdpPort: 9222,
      }),
    ).rejects.toThrow(BossDraftError)
  })

  it("requires platformChatUrl", async () => {
    const bitable = mockBitable()
    vi.mocked(bitable.findCandidateByCandidateId).mockResolvedValue({
      record_id: "rec_c",
      fields: {
        candidateId: "c1",
        resumeSource: "Boss直聘",
      },
    } as never)

    await expect(
      prepareBossInterviewDraft(bitable, "rec_iv", {
        profileDir: ".boss-test-profile",
        cdpPort: 9222,
      }),
    ).rejects.toThrow(/platformChatUrl/)
  })
})
