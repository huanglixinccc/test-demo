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
      interviewStatus: "待安排",
      notificationStatus: "未通知",
    })
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
