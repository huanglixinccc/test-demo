import { describe, it, expect, vi } from "vitest"
import { runReviewReminderOnce } from "../../src/scheduler/reviewReminder.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuIM } from "../../src/feishu/im.js"

describe("runReviewReminderOnce", () => {
  it("sends to all returned rows and marks 已提醒面评", async () => {
    const rows = [
      { record_id: "r1", fields: { interviewerOpenId: "ou_a", candidateName: "张三" } },
      { record_id: "r2", fields: { interviewerOpenId: "ou_b", candidateName: "李四" } },
      { record_id: "r3", fields: { interviewerOpenId: undefined, candidateName: "无人" } },
    ]
    const updateInterview = vi.fn().mockResolvedValue(undefined)
    const bitable = {
      listInterviewsNeedingReminder: vi.fn().mockResolvedValue(rows),
      updateInterview,
    } as unknown as BitableTables
    const im = {
      sendTextToUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as FeishuIM

    const sent = await runReviewReminderOnce({ bitable, im }, 9_999_999_999_999)
    expect(sent).toBe(2)
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_a", expect.stringContaining("张三"))
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_b", expect.stringContaining("李四"))
    expect(updateInterview).toHaveBeenCalledWith("r1", { notificationStatus: "已提醒面评" })
    expect(updateInterview).toHaveBeenCalledWith("r2", { notificationStatus: "已提醒面评" })
    expect(updateInterview).not.toHaveBeenCalledWith("r3", expect.anything())
  })

  it("returns 0 when nothing to remind", async () => {
    const bitable = {
      listInterviewsNeedingReminder: vi.fn().mockResolvedValue([]),
      updateInterview: vi.fn(),
    } as unknown as BitableTables
    const im = { sendTextToUser: vi.fn() } as unknown as FeishuIM
    const sent = await runReviewReminderOnce({ bitable, im })
    expect(sent).toBe(0)
    expect(im.sendTextToUser).not.toHaveBeenCalled()
  })
})
