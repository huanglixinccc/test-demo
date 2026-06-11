import { describe, it, expect, vi } from "vitest"
import { ensureInterviewShell } from "../../src/agents/interview/autoCreate.js"
import type { BitableTables } from "../../src/feishu/bitable.js"

describe("ensureInterviewShell", () => {
  it("creates Interview row when candidate enters 技术面 and none is open", async () => {
    const createInterview = vi.fn().mockResolvedValue({ record_id: "rec_iv", fields: {} })
    const bitable = {
      findOpenInterviewByCandidateId: vi.fn().mockResolvedValue(undefined),
      createInterview,
    } as unknown as BitableTables

    await ensureInterviewShell(bitable, {
      candidateRecordId: "rec_c",
      candidateId: "c1",
      candidateName: "张三",
      status: "技术面",
    })

    expect(createInterview).toHaveBeenCalledWith({
      candidateId: "c1",
      candidateName: "张三",
      notificationStatus: "未通知",
    })
  })

  it("creates only one shell under concurrent calls", async () => {
    const createInterview = vi.fn().mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ record_id: "rec_iv", fields: {} }), 30)),
    )
    const bitable = {
      findOpenInterviewByCandidateId: vi.fn().mockResolvedValue(undefined),
      createInterview,
    } as unknown as BitableTables

    const payload = {
      candidateRecordId: "rec_c",
      candidateId: "c1",
      candidateName: "张三",
      status: "技术面" as const,
    }
    await Promise.all([
      ensureInterviewShell(bitable, payload),
      ensureInterviewShell(bitable, payload),
    ])

    expect(createInterview).toHaveBeenCalledTimes(1)
  })

  it("skips when an open Interview already exists", async () => {
    const createInterview = vi.fn()
    const bitable = {
      findOpenInterviewByCandidateId: vi.fn().mockResolvedValue({
        record_id: "rec_iv",
        fields: { interviewStatus: "待安排" },
      }),
      createInterview,
    } as unknown as BitableTables

    await ensureInterviewShell(bitable, {
      candidateRecordId: "rec_c",
      candidateId: "c1",
      candidateName: "张三",
      status: "技术面",
    })

    expect(createInterview).not.toHaveBeenCalled()
  })

  it("does nothing for non-interview stages like Offer", async () => {
    const createInterview = vi.fn()
    const bitable = {
      findOpenInterviewByCandidateId: vi.fn(),
      createInterview,
    } as unknown as BitableTables

    await ensureInterviewShell(bitable, {
      candidateRecordId: "rec_c",
      candidateId: "c1",
      candidateName: "张三",
      status: "Offer",
    })

    expect(bitable.findOpenInterviewByCandidateId).not.toHaveBeenCalled()
    expect(createInterview).not.toHaveBeenCalled()
  })
})
