import { describe, it, expect, vi, beforeEach } from "vitest"
import { registerInterviewAgent } from "../../src/agents/interview/index.js"
import { bus } from "../../src/events/bus.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuIM } from "../../src/feishu/im.js"

function deps(currentStatus = "技术面") {
  const updateInterview = vi.fn().mockResolvedValue(undefined)
  const updateCandidate = vi.fn().mockResolvedValue(undefined)
  const findCandidateByCandidateId = vi.fn().mockResolvedValue({
    record_id: "recCand",
    fields: { status: currentStatus },
  })
  const bitable = {
    updateInterview,
    updateCandidate,
    findCandidateByCandidateId,
  } as unknown as BitableTables
  const im = {
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as FeishuIM
  return { bitable, im, updateInterview, updateCandidate, findCandidateByCandidateId }
}

describe("InterviewAgent", () => {
  beforeEach(() => bus._resetForTesting())

  it("on InterviewScheduled: sends card and updates interview row", async () => {
    const d = deps()
    registerInterviewAgent({ bitable: d.bitable, im: d.im, hrOpenIds: ["ou_hr"] })

    bus.emit("InterviewScheduled", {
      interviewRecordId: "rec1",
      candidateId: "c1",
      candidateName: "张三",
      interviewerName: "李四",
      interviewerOpenId: "ou_int",
      interviewTime: 1_700_000_000_000,
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(d.im.sendCardToUser).toHaveBeenCalledWith("ou_int", expect.any(Object))
    expect(d.updateInterview).toHaveBeenCalledWith("rec1", {
      interviewStatus: "待面试",
      notificationStatus: "已通知",
    })
  })

  it("on ReviewSubmitted (通过 from 技术面): updates status to HR面 and notifies HR", async () => {
    const d = deps("技术面")
    registerInterviewAgent({ bitable: d.bitable, im: d.im, hrOpenIds: ["ou_hr1", "ou_hr2"] })

    bus.emit("ReviewSubmitted", {
      interviewRecordId: "rec1",
      candidateId: "c1",
      candidateName: "张三",
      interviewerName: "李四",
      reviewContent: "ok",
      reviewResult: "通过",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(d.updateInterview).toHaveBeenCalledWith("rec1", { interviewStatus: "已完成" })
    expect(d.updateCandidate).toHaveBeenCalledWith("recCand", { status: "HR面" })
    expect(d.im.sendTextToUser).toHaveBeenCalledTimes(2)
    expect(d.im.sendTextToUser).toHaveBeenCalledWith("ou_hr1", expect.stringContaining("HR面"))
  })

  it("does not update candidate if status would not change (待定)", async () => {
    const d = deps("技术面")
    registerInterviewAgent({ bitable: d.bitable, im: d.im, hrOpenIds: ["ou_hr"] })

    bus.emit("ReviewSubmitted", {
      interviewRecordId: "rec1",
      candidateId: "c1",
      candidateName: "张三",
      interviewerName: "李四",
      reviewContent: "ok",
      reviewResult: "待定",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(d.updateCandidate).not.toHaveBeenCalled()
    expect(d.updateInterview).toHaveBeenCalledWith("rec1", { interviewStatus: "已完成" })
  })
})
