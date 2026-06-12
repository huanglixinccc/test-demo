import { describe, it, expect, vi } from "vitest"
import { runInterviewWatchdogOnce } from "../../src/scheduler/interviewWatchdog.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuIM } from "../../src/feishu/im.js"
import {
  ATTENDANCE_CHECK_MS,
  NO_SHOW_ESCALATE_MS,
  REVIEW_HR_ESCALATE_MS,
} from "../../src/agents/interview/escalation.js"

const interviewTime = new Date("2026-06-12T14:00:00+08:00").getTime()

describe("runInterviewWatchdogOnce", () => {
  it("sends attendance check and updates escalation level", async () => {
    const updateInterview = vi.fn().mockResolvedValue(undefined)
    const bitable = {
      listAllInterviews: vi.fn().mockResolvedValue([
        {
          record_id: "rec_iv",
          fields: {
            candidateName: "王五",
            interviewerOpenId: "ou_iv",
            interviewTime,
            interviewStatus: "待面试",
            notificationStatus: "已通知",
          },
        },
      ]),
      updateInterview,
    } as unknown as BitableTables
    const im = { sendTextToUser: vi.fn().mockResolvedValue(undefined) } as unknown as FeishuIM

    const result = await runInterviewWatchdogOnce(
      { bitable, im, hrOpenIds: ["ou_hr"] },
      interviewTime + ATTENDANCE_CHECK_MS + 1000,
    )

    expect(result.attendanceChecks).toBe(1)
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_iv", expect.stringContaining("到场确认"))
    expect(updateInterview).toHaveBeenCalledWith(
      "rec_iv",
      expect.objectContaining({ escalationLevel: 1 }),
    )
  })

  it("escalates no-show to HR after 4h", async () => {
    const updateInterview = vi.fn().mockResolvedValue(undefined)
    const bitable = {
      listAllInterviews: vi.fn().mockResolvedValue([
        {
          record_id: "rec_iv",
          fields: {
            candidateName: "王五",
            interviewerOpenId: "ou_iv",
            interviewTime,
            interviewStatus: "待面评",
            escalationLevel: 1,
          },
        },
      ]),
      updateInterview,
    } as unknown as BitableTables
    const im = { sendTextToUser: vi.fn().mockResolvedValue(undefined) } as unknown as FeishuIM

    const result = await runInterviewWatchdogOnce(
      { bitable, im, hrOpenIds: ["ou_hr"] },
      interviewTime + NO_SHOW_ESCALATE_MS + 1000,
    )

    expect(result.noShowEscalations).toBe(1)
    expect(updateInterview).toHaveBeenCalledWith(
      "rec_iv",
      expect.objectContaining({
        exceptionType: "候选人爽约",
        exceptionStatus: "待处理",
        escalationLevel: 3,
      }),
    )
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_hr", expect.stringContaining("疑似爽约"))
  })

  it("escalates review overdue to HR after 24h", async () => {
    const updateInterview = vi.fn().mockResolvedValue(undefined)
    const bitable = {
      listAllInterviews: vi.fn().mockResolvedValue([
        {
          record_id: "rec_iv",
          fields: {
            candidateName: "王五",
            interviewerName: "黄立新",
            interviewerOpenId: "ou_iv",
            interviewTime,
            interviewStatus: "待面评",
            escalationLevel: 2,
            notificationStatus: "已提醒面评",
          },
        },
      ]),
      updateInterview,
    } as unknown as BitableTables
    const im = { sendTextToUser: vi.fn().mockResolvedValue(undefined) } as unknown as FeishuIM

    const result = await runInterviewWatchdogOnce(
      { bitable, im, hrOpenIds: ["ou_hr"] },
      interviewTime + REVIEW_HR_ESCALATE_MS + 1000,
    )

    expect(result.reviewHrEscalations).toBe(1)
    expect(updateInterview).toHaveBeenCalledWith(
      "rec_iv",
      expect.objectContaining({
        exceptionType: "面评超时",
        exceptionStatus: "待处理",
      }),
    )
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_hr", expect.stringContaining("面评超时"))
  })
})
