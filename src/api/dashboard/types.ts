export interface DashboardQuery {
  position?: string
  startTime?: number
  endTime?: number
  search?: string
}

export interface DashboardCandidateDto {
  recordId: string
  candidateId: string
  name: string | null
  position: string | null
  phone: string | null
  email: string | null
  skills: string[]
  resumeSource: string
  resumeUrl?: string | null
  platformChatUrl?: string | null
  status: string
  matchScore?: number | null
  priority?: string | null
  rejectReason?: string | null
  createdAt: number
}

export interface DashboardInterviewDto {
  recordId: string
  interviewId?: string
  interviewerName?: string
  interviewerOpenId?: string
  interviewTime?: number
  interviewStatus?: string
  reviewResult?: string | null
  reviewContent?: string
  meetingUrl?: string | null
  exceptionType?: string | null
  exceptionStatus?: string | null
  escalationLevel?: number | null
  exceptionNote?: string | null
}

export interface DashboardReferralDto {
  referrerName: string
  referrerOpenId: string
  referralTime: number
  currentStatus: string
}

export interface UpcomingInterviewDto {
  interviewRecordId: string
  candidateId: string
  candidateRecordId?: string
  candidateName: string
  position: string
  interviewerName: string
  interviewTime: number
  interviewStatus: string
  meetingUrl?: string | null
}

export interface MeetingLinkResponse {
  clipboardText: string
  fromCache: boolean
  meeting: {
    url: string
    meetingNo: string
    password?: string
    appLink: string
  }
}

export function parseDashboardQuery(
  q: Record<string, unknown>,
): DashboardQuery {
  const out: DashboardQuery = {}
  if (typeof q.position === "string" && q.position.trim()) {
    out.position = q.position.trim()
  }
  if (typeof q.search === "string" && q.search.trim()) {
    out.search = q.search.trim()
  }
  const start = Number(q.startTime)
  if (Number.isFinite(start) && start > 0) out.startTime = start
  const end = Number(q.endTime)
  if (Number.isFinite(end) && end > 0) out.endTime = end
  return out
}

export type UpcomingPeriod = "today" | "week"

export function parseUpcomingPeriod(raw: unknown): UpcomingPeriod {
  return raw === "week" ? "week" : "today"
}
