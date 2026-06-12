export const ATTENDANCE_CHECK_MS = 60 * 60 * 1000
export const REVIEW_REMIND_MS = 2 * 60 * 60 * 1000
export const NO_SHOW_ESCALATE_MS = 4 * 60 * 60 * 1000
export const REVIEW_HR_ESCALATE_MS = 24 * 60 * 60 * 1000
export const TRANSITION_TO_REVIEW_MS = 30 * 60 * 1000

export type WatchdogAction =
  | { type: "none" }
  | { type: "attendance_check" }
  | { type: "no_show_escalate" }
  | { type: "review_remind" }
  | { type: "review_hr_escalate" }

function isAwaitingOutcome(status?: string): boolean {
  return status === "待面试" || status === "待面评"
}

export interface InterviewWatchInput {
  interviewStatus?: string
  interviewTime?: number
  reviewContent?: string
  exceptionType?: string
  exceptionStatus?: string
  escalationLevel?: number
  now: number
}

function hasReview(content?: string): boolean {
  return Boolean(content?.trim())
}

function elapsed(input: InterviewWatchInput): number {
  return input.now - (input.interviewTime ?? 0)
}

export function decideWatchdogAction(input: InterviewWatchInput): WatchdogAction {
  const status = input.interviewStatus
  const time = input.interviewTime ?? 0
  if (!time || time <= 0) return { type: "none" }
  if (status === "已完成" || status === "待安排") return { type: "none" }
  if (hasReview(input.reviewContent)) return { type: "none" }
  if (input.exceptionStatus === "已处理") return { type: "none" }

  const ms = elapsed(input)
  if (ms < 0) return { type: "none" }

  const level = input.escalationLevel ?? 0
  const exceptionType = input.exceptionType?.trim() ?? ""

  if (!isAwaitingOutcome(status)) return { type: "none" }

  if (
    exceptionType !== "候选人爽约" &&
    ms >= REVIEW_HR_ESCALATE_MS &&
    level < 3 &&
    exceptionType !== "面评超时"
  ) {
    return { type: "review_hr_escalate" }
  }

  if (ms >= NO_SHOW_ESCALATE_MS && level >= 1 && level < 3 && !exceptionType) {
    return { type: "no_show_escalate" }
  }

  if (exceptionType !== "候选人爽约" && ms >= REVIEW_REMIND_MS && level < 2) {
    return { type: "review_remind" }
  }

  if (ms >= ATTENDANCE_CHECK_MS && level < 1 && !exceptionType) {
    return { type: "attendance_check" }
  }

  return { type: "none" }
}
