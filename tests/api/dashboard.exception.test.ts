import { describe, it, expect, vi } from "vitest"
import { reportInterviewException } from "../../src/api/dashboard/handlers.js"
import type { BitableTables } from "../../src/feishu/bitable.js"

function mockInterview(overrides: Record<string, unknown> = {}) {
  return {
    record_id: "rec_iv",
    fields: {
      candidateName: "王五",
      interviewStatus: "待面评",
      interviewTime: Date.now() - 3600000,
      ...overrides,
    },
  }
}

describe("reportInterviewException", () => {
  it("marks no_show and completes interview", async () => {
    const getInterview = vi
      .fn()
      .mockResolvedValueOnce(mockInterview())
      .mockResolvedValueOnce(
        mockInterview({
          exceptionType: "候选人爽约",
          exceptionStatus: "待处理",
          interviewStatus: "已完成",
          escalationLevel: 3,
        }),
      )
    const updateInterview = vi.fn().mockResolvedValue(undefined)
    const bitable = { getInterview, updateInterview } as unknown as BitableTables

    const result = await reportInterviewException(bitable, "rec_iv", {
      action: "no_show",
      note: "未到场",
    })

    expect(updateInterview).toHaveBeenCalledWith("rec_iv", {
      exceptionType: "候选人爽约",
      exceptionStatus: "待处理",
      escalationLevel: 3,
      interviewStatus: "已完成",
      exceptionNote: "未到场",
    })
    expect(result.exceptionType).toBe("候选人爽约")
  })

  it("cancels interview and resets to 待安排", async () => {
    const getInterview = vi
      .fn()
      .mockResolvedValueOnce(mockInterview({ interviewStatus: "待面试" }))
      .mockResolvedValueOnce(
        mockInterview({
          exceptionType: "面试官取消",
          exceptionStatus: "待处理",
          interviewStatus: "待安排",
        }),
      )
    const updateInterview = vi.fn().mockResolvedValue(undefined)
    const bitable = { getInterview, updateInterview } as unknown as BitableTables

    await reportInterviewException(bitable, "rec_iv", { action: "cancel" })
    expect(updateInterview).toHaveBeenCalledWith(
      "rec_iv",
      expect.objectContaining({
        exceptionType: "面试官取消",
        interviewStatus: "待安排",
      }),
    )
  })

  it("resolves pending exception", async () => {
    const getInterview = vi
      .fn()
      .mockResolvedValueOnce(
        mockInterview({
          exceptionType: "面评超时",
          exceptionStatus: "待处理",
        }),
      )
      .mockResolvedValueOnce(
        mockInterview({
          exceptionType: "面评超时",
          exceptionStatus: "已处理",
        }),
      )
    const updateInterview = vi.fn().mockResolvedValue(undefined)
    const bitable = { getInterview, updateInterview } as unknown as BitableTables

    const result = await reportInterviewException(bitable, "rec_iv", { action: "resolve" })
    expect(updateInterview).toHaveBeenCalledWith("rec_iv", { exceptionStatus: "已处理" })
    expect(result.exceptionStatus).toBe("已处理")
  })

  it("rejects no_show on completed interview", async () => {
    const bitable = {
      getInterview: vi.fn().mockResolvedValue(
        mockInterview({ interviewStatus: "已完成", reviewResult: "通过" }),
      ),
      updateInterview: vi.fn(),
    } as unknown as BitableTables

    await expect(
      reportInterviewException(bitable, "rec_iv", { action: "no_show" }),
    ).rejects.toThrow(/已完成/)
  })
})
