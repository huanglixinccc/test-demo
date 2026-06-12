import { describe, it, expect, vi } from "vitest"
import { decideWatchdogAction } from "../../src/agents/interview/escalation.js"
import { runInterviewWatchdogOnce } from "../../src/scheduler/interviewWatchdog.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuIM } from "../../src/feishu/im.js"

describe("review reminder via interviewWatchdog", () => {
  it("sends to all returned rows and marks 已提醒面评", async () => {
    const rows = [
      { record_id: "r1", fields: { interviewerOpenId: "ou_a", candidateName: "张三" } },
      { record_id: "r2", fields: { interviewerOpenId: "ou_b", candidateName: "李四" } },
      { record_id: "r3", fields: { interviewerOpenId: undefined, candidateName: "无人" } },
    ]
    const updateInterview = vi.fn().mockResolvedValue(undefined)
    const now = 9_999_999_999_999
    const interviewTime = now - 2.5 * 60 * 60 * 1000
    const bitable = {
      listAllInterviews: vi.fn().mockResolvedValue(
        rows.map((r) => ({
          ...r,
          fields: {
            ...r.fields,
            interviewTime,
            interviewStatus: "待面评",
            escalationLevel: 1,
          },
        })),
      ),
      updateInterview,
    } as unknown as BitableTables
    const im = {
      sendTextToUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as FeishuIM

    expect(
      decideWatchdogAction({
        interviewStatus: "待面评",
        interviewTime,
        escalationLevel: 1,
        now,
      }).type,
    ).toBe("review_remind")

    const result = await runInterviewWatchdogOnce({ bitable, im, hrOpenIds: [] }, now)
    expect(result.reviewReminders).toBe(3)
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_a", expect.stringContaining("张三"))
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_b", expect.stringContaining("李四"))
    expect(updateInterview).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({ notificationStatus: "已提醒面评", escalationLevel: 2 }),
    )
    expect(updateInterview).toHaveBeenCalledWith(
      "r2",
      expect.objectContaining({ notificationStatus: "已提醒面评", escalationLevel: 2 }),
    )
    expect(updateInterview).toHaveBeenCalledWith(
      "r3",
      expect.objectContaining({ notificationStatus: "已提醒面评", escalationLevel: 2 }),
    )
  })

  it("returns 0 when nothing to remind", async () => {
    const bitable = {
      listAllInterviews: vi.fn().mockResolvedValue([]),
      updateInterview: vi.fn(),
    } as unknown as BitableTables
    const im = { sendTextToUser: vi.fn() } as unknown as FeishuIM
    const result = await runInterviewWatchdogOnce({ bitable, im, hrOpenIds: [] })
    expect(result.reviewReminders).toBe(0)
    expect(im.sendTextToUser).not.toHaveBeenCalled()
  })
})
