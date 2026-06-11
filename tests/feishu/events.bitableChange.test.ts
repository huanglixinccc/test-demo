import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeBitableChangeHandler } from "../../src/feishu/events/bitableChange.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import { bus } from "../../src/events/bus.js"

function envelope(event: unknown) {
  return {
    schema: "2.0",
    header: {
      event_id: "ev_bc_1",
      event_type: "drive.file.bitable_record_changed_v1",
      create_time: "x",
      token: "t",
      app_id: "a",
      tenant_key: "t",
    },
    event,
  }
}

describe("bitable change handler", () => {
  const interviewTableId = "tIv"

  beforeEach(() => bus._resetForTesting())

  it("emits InterviewScheduled when row is 待安排 with interviewer + time", async () => {
    const bitable = {
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec1",
        fields: {
          candidateId: "c1",
          candidateName: "张三",
          interviewerName: "李四",
          interviewerOpenId: "ou_int",
          interviewTime: 1_700_000_000_000,
          interviewStatus: "待安排",
          notificationStatus: "未通知",
        },
      }),
    } as unknown as BitableTables
    const handler = makeBitableChangeHandler({ bitable, interviewTableId })
    const got = vi.fn()
    bus.on("InterviewScheduled", got)

    await handler(envelope({
      table_id: interviewTableId,
      action_list: [{ record_id: "rec1" }],
    }))
    await new Promise((r) => setImmediate(r))

    expect(got).toHaveBeenCalledWith(expect.objectContaining({ interviewerOpenId: "ou_int" }))
  })

  it("emits InterviewScheduled when status is empty (Feishu auto-save UX)", async () => {
    const bitable = {
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec_empty",
        fields: {
          candidateId: "c1",
          candidateName: "张三",
          interviewerName: "李四",
          interviewerOpenId: "ou_int",
          interviewTime: 1_700_000_000_000,
        },
      }),
    } as unknown as BitableTables
    const handler = makeBitableChangeHandler({ bitable, interviewTableId })
    const got = vi.fn()
    bus.on("InterviewScheduled", got)

    await handler(envelope({
      table_id: interviewTableId,
      action_list: [{ record_id: "rec_empty" }],
    }))
    await new Promise((r) => setImmediate(r))

    expect(got).toHaveBeenCalledWith(expect.objectContaining({ interviewerOpenId: "ou_int" }))
  })

  it("emits ReviewSubmitted when reviewResult is set and status not 已完成", async () => {
    const bitable = {
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec2",
        fields: {
          candidateId: "c1",
          candidateName: "张三",
          reviewContent: "ok",
          reviewResult: "通过",
          interviewStatus: "待面评",
        },
      }),
    } as unknown as BitableTables
    const handler = makeBitableChangeHandler({ bitable, interviewTableId })
    const got = vi.fn()
    bus.on("ReviewSubmitted", got)

    await handler(envelope({
      table_id: interviewTableId,
      action_list: [{ record_id: "rec2" }],
    }))
    await new Promise((r) => setImmediate(r))

    expect(got).toHaveBeenCalledWith(expect.objectContaining({ reviewResult: "通过" }))
  })

  it("ignores events for other tables", async () => {
    const bitable = { getInterview: vi.fn() } as unknown as BitableTables
    const handler = makeBitableChangeHandler({ bitable, interviewTableId })
    const got = vi.fn()
    bus.on("InterviewScheduled", got)
    bus.on("ReviewSubmitted", got)

    await handler(envelope({ table_id: "tOther", action_list: [{ record_id: "x" }] }))
    expect(bitable.getInterview).not.toHaveBeenCalled()
    expect(got).not.toHaveBeenCalled()
  })

  it("emits CandidateStatusChanged for Candidate-table change with status", async () => {
    const bitable = {
      getInterview: vi.fn(),
      getCandidate: vi.fn().mockResolvedValue({
        record_id: "rec_c",
        fields: {
          candidateId: "c1",
          name: "张三",
          status: "技术面",
        },
      }),
    } as unknown as BitableTables
    const handler = makeBitableChangeHandler({
      bitable,
      interviewTableId,
      candidateTableId: "tCand",
    })
    const got = vi.fn()
    bus.on("CandidateStatusChanged", got)

    await handler(envelope({
      table_id: "tCand",
      action_list: [{ record_id: "rec_c" }],
    }))
    await new Promise((r) => setImmediate(r))

    expect(got).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "c1",
        candidateName: "张三",
        status: "技术面",
      }),
    )
  })

  it("prefers status from webhook after_value when getCandidate is stale", async () => {
    const bitable = {
      getInterview: vi.fn(),
      getCandidate: vi.fn().mockResolvedValue({
        record_id: "rec_c",
        fields: {
          candidateId: "c1",
          name: "张三",
          status: "待筛选",
        },
      }),
    } as unknown as BitableTables
    const handler = makeBitableChangeHandler({
      bitable,
      interviewTableId,
      candidateTableId: "tCand",
    })
    const got = vi.fn()
    bus.on("CandidateStatusChanged", got)

    await handler(envelope({
      table_id: "tCand",
      action_list: [{
        record_id: "rec_c",
        action: "record_edited",
        after_value: [{ field_id: "fld_status", field_value: "技术面" }],
      }],
    }))
    await new Promise((r) => setImmediate(r))

    expect(got).toHaveBeenCalledWith(
      expect.objectContaining({ candidateId: "c1", status: "技术面" }),
    )
  })

  it("does not emit CandidateStatusChanged when status is empty", async () => {
    const bitable = {
      getInterview: vi.fn(),
      getCandidate: vi.fn().mockResolvedValue({
        record_id: "rec_c2",
        fields: { candidateId: "c1", name: "张三" },
      }),
    } as unknown as BitableTables
    const handler = makeBitableChangeHandler({
      bitable,
      interviewTableId,
      candidateTableId: "tCand",
    })
    const got = vi.fn()
    bus.on("CandidateStatusChanged", got)

    await handler(envelope({
      table_id: "tCand",
      action_list: [{ record_id: "rec_c2" }],
    }))
    await new Promise((r) => setImmediate(r))

    expect(got).not.toHaveBeenCalled()
  })

  it("does not re-emit InterviewScheduled if already 已通知", async () => {
    const bitable = {
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec3",
        fields: {
          interviewerOpenId: "ou_int",
          interviewTime: 1,
          interviewStatus: "待安排",
          notificationStatus: "已通知",
        },
      }),
    } as unknown as BitableTables
    const handler = makeBitableChangeHandler({ bitable, interviewTableId })
    const got = vi.fn()
    bus.on("InterviewScheduled", got)
    await handler(envelope({
      table_id: interviewTableId,
      action_list: [{ record_id: "rec3" }],
    }))
    await new Promise((r) => setImmediate(r))
    expect(got).not.toHaveBeenCalled()
  })
})
