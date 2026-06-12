import type { FeishuClient } from "./client.js"
import { normalizeBitableFieldValue } from "./bitableFields.js"

export type CandidateStatus =
  | "待筛选"
  | "初筛通过"
  | "技术面"
  | "HR面"
  | "Offer"
  | "入职"
  | "淘汰"

export type ReviewResult = "通过" | "待定" | "淘汰"

export type InterviewStatus = "待安排" | "待面试" | "待面评" | "已完成"

export type InterviewExceptionType = "候选人爽约" | "面评超时" | "面试官取消" | "改期"

export type InterviewExceptionStatus = "无" | "待处理" | "已处理"

export interface CandidateFields {
  candidateId: string
  name: string | null
  position: string | null
  phone: string | null
  email: string | null
  skills: string[]
  resumeSource: string
  resumeUrl?: string | null
  /** Boss 等平台私信会话页链接，用于 Playwright 预填话术 */
  platformChatUrl?: string | null
  status: CandidateStatus
  matchScore?: number | null
  priority?: "高" | "中" | "低" | null
  rejectReason?: string | null
  createdAt: number
}

export interface InterviewFields {
  interviewId?: string
  candidateId?: string
  candidateName?: string
  interviewerName?: string
  interviewerOpenId?: string
  interviewTime?: number
  interviewStatus?: InterviewStatus
  reviewContent?: string
  reviewResult?: ReviewResult
  notificationStatus?: "未通知" | "已通知" | "已提醒面评"
  meetingUrl?: string | null
  exceptionType?: InterviewExceptionType | null
  exceptionStatus?: InterviewExceptionStatus | null
  escalationLevel?: number | null
  lastRemindedAt?: number | null
  exceptionNote?: string | null
}

export interface JobDescriptionFields {
  jobId?: string
  position: string
  requirement: string
  headCount?: number | null
}

export interface ReferralFields {
  candidateId: string
  candidateName: string
  referrerName: string
  referrerOpenId: string
  referralTime: number
  currentStatus: string
}

export interface BitableRecord<F> {
  record_id: string
  fields: F
  /** Bitable row creation time (ms), returned by search/get APIs. */
  created_time?: number
  last_modified_time?: number
}

export interface BitableTableIds {
  candidate: string
  interview: string
  referral: string
  jd: string
}

export class BitableTables {
  constructor(
    private readonly client: FeishuClient,
    private readonly appToken: string,
    private readonly tables: BitableTableIds,
  ) {}

  private base(tableId: string): string {
    return `/open-apis/bitable/v1/apps/${this.appToken}/tables/${tableId}`
  }

  async createCandidate(fields: CandidateFields): Promise<BitableRecord<CandidateFields>> {
    const data = await this.client.request<{ record: BitableRecord<CandidateFields> }>(
      "POST",
      `${this.base(this.tables.candidate)}/records`,
      { data: { fields } },
    )
    return data.record
  }

  async getInterview(recordId: string): Promise<BitableRecord<InterviewFields>> {
    const data = await this.client.request<{ record: BitableRecord<InterviewFields> }>(
      "GET",
      `${this.base(this.tables.interview)}/records/${recordId}`,
    )
    return data.record
  }

  async updateInterview(recordId: string, fields: Partial<InterviewFields>): Promise<void> {
    await this.client.request("PUT", `${this.base(this.tables.interview)}/records/${recordId}`, {
      data: { fields },
    })
  }

  async createInterview(
    fields: Pick<InterviewFields, "candidateId" | "candidateName"> &
      Partial<InterviewFields>,
  ): Promise<BitableRecord<InterviewFields>> {
    const data = await this.client.request<{ record: BitableRecord<InterviewFields> }>(
      "POST",
      `${this.base(this.tables.interview)}/records`,
      { data: { fields } },
    )
    return data.record
  }

  async findInterviewsByCandidateId(
    candidateId: string,
  ): Promise<BitableRecord<InterviewFields>[]> {
    const data = await this.client.request<{ items?: BitableRecord<InterviewFields>[] }>(
      "POST",
      `${this.base(this.tables.interview)}/records/search`,
      {
        data: {
          filter: {
            conjunction: "and",
            conditions: [
              { field_name: "candidateId", operator: "is", value: [candidateId] },
            ],
          },
          page_size: 100,
        },
      },
    )
    return data.items ?? []
  }

  async findOpenInterviewByCandidateId(
    candidateId: string,
  ): Promise<BitableRecord<InterviewFields> | undefined> {
    const items = await this.findInterviewsByCandidateId(candidateId)
    return items.find((r) => {
      const status = r.fields.interviewStatus
      return !status || status !== "已完成"
    })
  }

  async findCandidateByCandidateId(
    candidateId: string,
  ): Promise<BitableRecord<CandidateFields> | undefined> {
    const data = await this.client.request<{ items?: BitableRecord<CandidateFields>[] }>(
      "POST",
      `${this.base(this.tables.candidate)}/records/search`,
      {
        data: {
          filter: {
            conjunction: "and",
            conditions: [
              { field_name: "candidateId", operator: "is", value: [candidateId] },
            ],
          },
          page_size: 1,
        },
      },
    )
    return data.items?.[0]
  }

  async getCandidate(recordId: string): Promise<BitableRecord<CandidateFields>> {
    const data = await this.client.request<{ record: BitableRecord<CandidateFields> }>(
      "GET",
      `${this.base(this.tables.candidate)}/records/${recordId}`,
    )
    return data.record
  }

  async updateCandidate(recordId: string, fields: Partial<CandidateFields>): Promise<void> {
    await this.client.request("PUT", `${this.base(this.tables.candidate)}/records/${recordId}`, {
      data: { fields },
    })
  }

  async listAllJDs(): Promise<BitableRecord<JobDescriptionFields>[]> {
    const items: BitableRecord<JobDescriptionFields>[] = []
    let pageToken: string | undefined
    do {
      const data = await this.client.request<{
        items?: BitableRecord<JobDescriptionFields>[]
        page_token?: string
        has_more?: boolean
      }>("POST", `${this.base(this.tables.jd)}/records/search`, {
        data: {
          page_size: 500,
          ...(pageToken ? { page_token: pageToken } : {}),
        },
      })
      items.push(...(data.items ?? []))
      pageToken = data.has_more ? data.page_token : undefined
    } while (pageToken)
    return items
  }

  async findJdByPosition(
    position: unknown,
  ): Promise<BitableRecord<JobDescriptionFields> | undefined> {
    const pos = normalizeBitableFieldValue(position)?.toLowerCase()
    if (!pos) return undefined
    const jds = await this.listAllJDs()
    const normalized = jds.map((r) => ({
      record: r,
      title: normalizeBitableFieldValue(r.fields.position)?.toLowerCase() ?? "",
    }))
    const exact = normalized.find((j) => j.title === pos)
    if (exact) return exact.record
    const partial = normalized.find(
      (j) => j.title && (j.title.includes(pos) || pos.includes(j.title)),
    )
    return partial?.record
  }

  async createReferral(fields: ReferralFields): Promise<BitableRecord<ReferralFields>> {
    const data = await this.client.request<{ record: BitableRecord<ReferralFields> }>(
      "POST",
      `${this.base(this.tables.referral)}/records`,
      { data: { fields } },
    )
    return data.record
  }

  async findReferralByCandidateId(
    candidateId: string,
  ): Promise<BitableRecord<ReferralFields> | undefined> {
    const data = await this.client.request<{ items?: BitableRecord<ReferralFields>[] }>(
      "POST",
      `${this.base(this.tables.referral)}/records/search`,
      {
        data: {
          filter: {
            conjunction: "and",
            conditions: [
              { field_name: "candidateId", operator: "is", value: [candidateId] },
            ],
          },
          page_size: 1,
        },
      },
    )
    return data.items?.[0]
  }

  async updateReferral(recordId: string, fields: Partial<ReferralFields>): Promise<void> {
    await this.client.request("PUT", `${this.base(this.tables.referral)}/records/${recordId}`, {
      data: { fields },
    })
  }

  async listAllCandidates(): Promise<BitableRecord<CandidateFields>[]> {
    const items: BitableRecord<CandidateFields>[] = []
    let pageToken: string | undefined
    do {
      const data = await this.client.request<{
        items?: BitableRecord<CandidateFields>[]
        page_token?: string
        has_more?: boolean
      }>("POST", `${this.base(this.tables.candidate)}/records/search`, {
        data: {
          page_size: 500,
          ...(pageToken ? { page_token: pageToken } : {}),
        },
      })
      items.push(...(data.items ?? []))
      pageToken = data.has_more ? data.page_token : undefined
    } while (pageToken)
    return items
  }

  async listAllReferrals(): Promise<BitableRecord<ReferralFields>[]> {
    const items: BitableRecord<ReferralFields>[] = []
    let pageToken: string | undefined
    do {
      const data = await this.client.request<{
        items?: BitableRecord<ReferralFields>[]
        page_token?: string
        has_more?: boolean
      }>("POST", `${this.base(this.tables.referral)}/records/search`, {
        data: {
          page_size: 500,
          ...(pageToken ? { page_token: pageToken } : {}),
        },
      })
      items.push(...(data.items ?? []))
      pageToken = data.has_more ? data.page_token : undefined
    } while (pageToken)
    return items
  }

  async listAllInterviews(): Promise<BitableRecord<InterviewFields>[]> {
    const items: BitableRecord<InterviewFields>[] = []
    let pageToken: string | undefined
    do {
      const data = await this.client.request<{
        items?: BitableRecord<InterviewFields>[]
        page_token?: string
        has_more?: boolean
      }>("POST", `${this.base(this.tables.interview)}/records/search`, {
        data: {
          page_size: 500,
          ...(pageToken ? { page_token: pageToken } : {}),
        },
      })
      items.push(...(data.items ?? []))
      pageToken = data.has_more ? data.page_token : undefined
    } while (pageToken)
    return items
  }

  async listInterviewsNeedingReminder(now: number): Promise<BitableRecord<InterviewFields>[]> {
    const data = await this.client.request<{ items?: BitableRecord<InterviewFields>[] }>(
      "POST",
      `${this.base(this.tables.interview)}/records/search`,
      {
        data: {
          filter: {
            conjunction: "and",
            conditions: [
              { field_name: "interviewStatus", operator: "is", value: ["待面试"] },
            ],
          },
          page_size: 100,
        },
      },
    )
    const items = data.items ?? []
    return items.filter((r) => {
      const t = r.fields.interviewTime ?? 0
      const reviewed = (r.fields.reviewContent ?? "").length > 0
      const notified = r.fields.notificationStatus === "已提醒面评"
      return t > 0 && t + 60 * 60 * 1000 < now && !reviewed && !notified
    })
  }
}
