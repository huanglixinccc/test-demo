import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { registerReferralAgent } from "../../src/agents/referral/index.js"
import { bus } from "../../src/events/bus.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuIM } from "../../src/feishu/im.js"

function deps(
  overrides: Partial<{
    aiContent: string
    createCandidateOk: boolean
    createReferralOk: boolean
  }> = {},
) {
  const ai = {
    chat: vi.fn().mockResolvedValue(
      overrides.aiContent ??
        `{"name":"张三","phone":"138","email":"a@b.com","position":"前端","yearsOfExperience":3,"skills":["React"]}`,
    ),
  }
  const createCandidate =
    overrides.createCandidateOk === false
      ? vi.fn().mockRejectedValue(new Error("boom"))
      : vi.fn().mockResolvedValue({ record_id: "rec_c", fields: {} })
  const createReferral =
    overrides.createReferralOk === false
      ? vi.fn().mockRejectedValue(new Error("ref boom"))
      : vi.fn().mockResolvedValue({ record_id: "rec_r", fields: {} })
  const bitable = {
    createCandidate,
    createReferral,
    findReferralByCandidateId: vi.fn(),
    updateReferral: vi.fn().mockResolvedValue(undefined),
  } as unknown as BitableTables
  const im = {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as FeishuIM
  return { ai, bitable, im, createCandidate, createReferral }
}

describe("ReferralAgent", () => {
  beforeEach(() => bus._resetForTesting())

  it("creates Candidate + Referral and replies card on happy path", async () => {
    const { ai, bitable, im, createCandidate, createReferral } = deps()
    registerReferralAgent({ ai, bitable, im })

    bus.emit("ReferralReceived", {
      text: "内推 张三\n姓名:张三\n岗位:前端",
      senderOpenId: "ou_referrer_xyz",
      sourceMessageId: "om_1",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(createCandidate).toHaveBeenCalledTimes(1)
    expect(createCandidate.mock.calls[0]![0].resumeSource).toBe("内推")
    expect(createReferral).toHaveBeenCalledTimes(1)
    expect(createReferral.mock.calls[0]![0].referrerOpenId).toBe("ou_referrer_xyz")
    expect(createReferral.mock.calls[0]![0].currentStatus).toBe("待筛选")
    expect(im.sendCardToUser).toHaveBeenCalled()
  })

  it("warns user and skips if Candidate write fails", async () => {
    const { ai, bitable, im, createReferral } = deps({ createCandidateOk: false })
    registerReferralAgent({ ai, bitable, im })

    bus.emit("ReferralReceived", {
      text: "内推 张三",
      senderOpenId: "ou_x",
      sourceMessageId: "om_x",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(createReferral).not.toHaveBeenCalled()
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_x", expect.stringContaining("候选人入库失败"))
  })

  it("warns user but keeps Candidate if Referral write fails", async () => {
    const { ai, bitable, im, createCandidate } = deps({ createReferralOk: false })
    registerReferralAgent({ ai, bitable, im })

    bus.emit("ReferralReceived", {
      text: "内推 张三",
      senderOpenId: "ou_x",
      sourceMessageId: "om_x",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(createCandidate).toHaveBeenCalled()
    expect(im.sendTextToUser).toHaveBeenCalledWith(
      "ou_x",
      expect.stringContaining("建立内推关系失败"),
    )
  })

  it("notifies referrer when CandidateStatusChanged and status differs", async () => {
    const im = {
      sendTextToUser: vi.fn().mockResolvedValue(undefined),
      sendCardToUser: vi.fn(),
    } as unknown as FeishuIM
    const updateReferral = vi.fn().mockResolvedValue(undefined)
    const bitable = {
      findReferralByCandidateId: vi.fn().mockResolvedValue({
        record_id: "rec_r",
        fields: {
          candidateId: "c1",
          candidateName: "张三",
          referrerOpenId: "ou_referrer",
          currentStatus: "待筛选",
        },
      }),
      updateReferral,
    } as unknown as BitableTables
    registerReferralAgent({ ai: { chat: vi.fn() }, bitable, im })

    bus.emit("CandidateStatusChanged", {
      candidateRecordId: "rec_c",
      candidateId: "c1",
      candidateName: "张三",
      status: "技术面",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(updateReferral).toHaveBeenCalledWith("rec_r", { currentStatus: "技术面" })
    expect(im.sendTextToUser).toHaveBeenCalledWith(
      "ou_referrer",
      expect.stringContaining("技术面"),
    )
  })

  it("skips notify when status is unchanged", async () => {
    const im = {
      sendTextToUser: vi.fn().mockResolvedValue(undefined),
      sendCardToUser: vi.fn(),
    } as unknown as FeishuIM
    const bitable = {
      findReferralByCandidateId: vi.fn().mockResolvedValue({
        record_id: "rec_r",
        fields: {
          candidateId: "c1",
          candidateName: "张三",
          referrerOpenId: "ou_referrer",
          currentStatus: "技术面",
        },
      }),
      updateReferral: vi.fn(),
    } as unknown as BitableTables
    registerReferralAgent({ ai: { chat: vi.fn() }, bitable, im })

    bus.emit("CandidateStatusChanged", {
      candidateRecordId: "rec_c",
      candidateId: "c1",
      candidateName: "张三",
      status: "技术面",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(im.sendTextToUser).not.toHaveBeenCalled()
  })

  it("skips silently when candidate has no Referral", async () => {
    const im = {
      sendTextToUser: vi.fn(),
      sendCardToUser: vi.fn(),
    } as unknown as FeishuIM
    const bitable = {
      findReferralByCandidateId: vi.fn().mockResolvedValue(undefined),
      updateReferral: vi.fn(),
    } as unknown as BitableTables
    registerReferralAgent({ ai: { chat: vi.fn() }, bitable, im })

    bus.emit("CandidateStatusChanged", {
      candidateRecordId: "rec_c",
      candidateId: "c_unknown",
      candidateName: "李四",
      status: "Offer",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(im.sendTextToUser).not.toHaveBeenCalled()
  })

  it("re-fetches candidate after delay when webhook delivered stale status", async () => {
    vi.useFakeTimers()
    const im = {
      sendTextToUser: vi.fn().mockResolvedValue(undefined),
      sendCardToUser: vi.fn(),
    } as unknown as FeishuIM
    const findCandidateByCandidateId = vi.fn().mockResolvedValue({
      record_id: "rec_c",
      fields: { candidateId: "c1", name: "张三", status: "技术面" },
    })
    const bitable = {
      findReferralByCandidateId: vi.fn().mockResolvedValue({
        record_id: "rec_r",
        fields: {
          candidateId: "c1",
          candidateName: "张三",
          referrerOpenId: "ou_referrer",
          currentStatus: "待筛选",
        },
      }),
      updateReferral: vi.fn().mockResolvedValue(undefined),
      findCandidateByCandidateId,
    } as unknown as BitableTables
    registerReferralAgent({ ai: { chat: vi.fn() }, bitable, im })

    bus.emit("CandidateStatusChanged", {
      candidateRecordId: "rec_c",
      candidateId: "c1",
      candidateName: "张三",
      status: "待筛选",
    })

    await vi.advanceTimersByTimeAsync(900)
    await Promise.resolve()

    expect(findCandidateByCandidateId).toHaveBeenCalledWith("c1")
    expect(im.sendTextToUser).toHaveBeenCalledWith(
      "ou_referrer",
      expect.stringContaining("技术面"),
    )
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
