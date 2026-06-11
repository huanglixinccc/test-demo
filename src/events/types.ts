export interface ResumeReceivedPayload {
  text: string
  senderOpenId: string
  sourceMessageId: string
  filename?: string
}

export interface InterviewScheduledPayload {
  interviewRecordId: string
  candidateId: string
  candidateName: string
  interviewerName: string
  interviewerOpenId: string
  interviewTime: number
}

export interface ReviewSubmittedPayload {
  interviewRecordId: string
  candidateId: string
  candidateName: string
  interviewerName: string
  reviewContent: string
  reviewResult: "通过" | "待定" | "淘汰"
}

export type EventMap = {
  ResumeReceived: ResumeReceivedPayload
  InterviewScheduled: InterviewScheduledPayload
  ReviewSubmitted: ReviewSubmittedPayload
}
