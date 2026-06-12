import { describe, it, expect } from "vitest"
import {
  decideWatchdogAction,
  ATTENDANCE_CHECK_MS,
  REVIEW_REMIND_MS,
  NO_SHOW_ESCALATE_MS,
  REVIEW_HR_ESCALATE_MS,
} from "../../src/agents/interview/escalation.js"

const BASE_TIME = new Date("2026-06-12T14:00:00+08:00").getTime()

describe("decideWatchdogAction", () => {
  it("returns attendance_check after 1h", () => {
    const action = decideWatchdogAction({
      interviewStatus: "待面评",
      interviewTime: BASE_TIME,
      reviewContent: "",
      escalationLevel: 0,
      now: BASE_TIME + ATTENDANCE_CHECK_MS + 1000,
    })
    expect(action.type).toBe("attendance_check")
  })

  it("returns review_remind after 2h", () => {
    const action = decideWatchdogAction({
      interviewStatus: "待面评",
      interviewTime: BASE_TIME,
      reviewContent: "",
      escalationLevel: 1,
      now: BASE_TIME + REVIEW_REMIND_MS + 1000,
    })
    expect(action.type).toBe("review_remind")
  })

  it("returns no_show_escalate after 4h when still no review", () => {
    const action = decideWatchdogAction({
      interviewStatus: "待面评",
      interviewTime: BASE_TIME,
      reviewContent: "",
      escalationLevel: 1,
      now: BASE_TIME + NO_SHOW_ESCALATE_MS + 1000,
    })
    expect(action.type).toBe("no_show_escalate")
  })

  it("returns review_hr_escalate after 24h", () => {
    const action = decideWatchdogAction({
      interviewStatus: "待面评",
      interviewTime: BASE_TIME,
      reviewContent: "",
      escalationLevel: 2,
      now: BASE_TIME + REVIEW_HR_ESCALATE_MS + 1000,
    })
    expect(action.type).toBe("review_hr_escalate")
  })

  it("skips when review already filled", () => {
    const action = decideWatchdogAction({
      interviewStatus: "待面评",
      interviewTime: BASE_TIME,
      reviewContent: "不错",
      escalationLevel: 0,
      now: BASE_TIME + REVIEW_HR_ESCALATE_MS + 1000,
    })
    expect(action.type).toBe("none")
  })

  it("skips when exception already handled", () => {
    const action = decideWatchdogAction({
      interviewStatus: "待面评",
      interviewTime: BASE_TIME,
      reviewContent: "",
      exceptionStatus: "已处理",
      escalationLevel: 3,
      now: BASE_TIME + REVIEW_HR_ESCALATE_MS + 1000,
    })
    expect(action.type).toBe("none")
  })
})
