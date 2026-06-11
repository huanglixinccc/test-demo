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
