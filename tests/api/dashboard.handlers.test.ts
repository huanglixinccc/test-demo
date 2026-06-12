import { describe, it, expect, vi } from "vitest"
import {
  listCandidates,
  getCandidateDetail,
  updateCandidateStatus,
  getFunnel,
} from "../../src/api/dashboard/handlers.js"
import type { BitableTables, BitableRecord, CandidateFields, InterviewFields } from "../../src/feishu/bitable.js"

function mockBitable(overrides: Partial<BitableTables> = {}): BitableTables {
  return {
    listAllCandidates: vi.fn().mockResolvedValue([]),
    getCandidate: vi.fn(),
    updateCandidate: vi.fn().mockResolvedValue(undefined),
    findInterviewsByCandidateId: vi.fn().mockResolvedValue([]),
    findReferralByCandidateId: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as BitableTables
}

const sampleRecord: BitableRecord<CandidateFields> = {
  record_id: "rec1",
  fields: {
    candidateId: "c1",
    name: "张三",
    position: "前端",
    phone: null,
    email: null,
    skills: ["React"],
    resumeSource: "飞书机器人",
    status: "技术面",
    createdAt: 1000,
  },
}

describe("dashboard handlers", () => {
  it("listCandidates filters by search name", async () => {
    const bitable = mockBitable({
      listAllCandidates: vi.fn().mockResolvedValue([
        sampleRecord,
        {
          record_id: "rec2",
          fields: { ...sampleRecord.fields, name: "李四", candidateId: "c2" },
        },
      ]),
    })
    const items = await listCandidates(bitable, { search: "张" })
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe("张三")
  })

  it("updateCandidateStatus rejects invalid status", async () => {
    const bitable = mockBitable()
    await expect(
      updateCandidateStatus(bitable, "rec1", "无效状态"),
    ).rejects.toThrow("Invalid status")
  })

  it("updateCandidateStatus writes to bitable", async () => {
    const updateCandidate = vi.fn().mockResolvedValue(undefined)
    const bitable = mockBitable({ updateCandidate })
    await updateCandidateStatus(bitable, "rec1", "HR面")
    expect(updateCandidate).toHaveBeenCalledWith("rec1", { status: "HR面", rejectReason: null })
  })

  it("getFunnel returns computeFunnel result", async () => {
    const bitable = mockBitable({
      listAllCandidates: vi.fn().mockResolvedValue([sampleRecord]),
    })
    const funnel = await getFunnel(bitable, {})
    expect(funnel.resume).toBe(1)
    expect(funnel.interview).toBe(1)
  })

  it("getCandidateDetail includes interviews", async () => {
    const bitable = mockBitable({
      getCandidate: vi.fn().mockResolvedValue(sampleRecord),
      findInterviewsByCandidateId: vi.fn().mockResolvedValue([
        {
          record_id: "int1",
          fields: {
            interviewId: "i1",
            interviewerName: "王五",
            interviewStatus: "待面评",
          } as InterviewFields,
        },
      ]),
    })
    const detail = await getCandidateDetail(bitable, "rec1")
    expect(detail.candidate.name).toBe("张三")
    expect(detail.interviews).toHaveLength(1)
    expect(detail.referral).toBeNull()
  })
})
