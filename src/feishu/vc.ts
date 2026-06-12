import type { FeishuClient } from "./client.js"

export interface CreateMeetingParams {
  topic: string
  ownerId: string
  endTimeSec: number
  hostIds?: string[]
}

export interface MeetingReserve {
  id: string
  meetingNo: string
  url: string
  appLink: string
  liveLink?: string
  password?: string
  endTime: string
}

interface ReserveApiResponse {
  reserve: {
    id: string
    meeting_no: string
    password?: string
    url: string
    app_link: string
    live_link?: string
    end_time: string
  }
}

export class FeishuVC {
  constructor(private readonly client: FeishuClient) {}

  async createReserve(params: CreateMeetingParams): Promise<MeetingReserve> {
    const data = await this.client.request<ReserveApiResponse>(
      "POST",
      "/open-apis/vc/v1/reserves/apply?user_id_type=open_id",
      {
        data: {
          end_time: String(params.endTimeSec),
          owner_id: params.ownerId,
          meeting_settings: {
            topic: params.topic,
            meeting_initial_type: 1,
            ...(params.hostIds?.length
              ? {
                  assign_host_list: params.hostIds.map((id) => ({
                    user_type: 1,
                    id,
                  })),
                }
              : {}),
          },
        },
      },
    )

    const r = data.reserve
    return {
      id: r.id,
      meetingNo: r.meeting_no,
      url: r.url,
      appLink: r.app_link,
      liveLink: r.live_link,
      password: r.password,
      endTime: r.end_time,
    }
  }
}

/** Default meeting reservation lasts 2 hours after scheduled start. */
export const MEETING_DURATION_SEC = 2 * 60 * 60

export function buildMeetingClipboardText(opts: {
  candidateName: string
  position: string
  interviewerName: string
  interviewTimeMs: number
  meeting: MeetingReserve
}): string {
  const timeStr = new Date(opts.interviewTimeMs).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const lines = [
    "【飞书视频会议邀请】",
    `候选人：${opts.candidateName}`,
    `应聘职位：${opts.position}`,
    `面试官：${opts.interviewerName}`,
    `面试时间：${timeStr}`,
  ]
  if (opts.meeting.meetingNo) {
    lines.push(`会议号：${opts.meeting.meetingNo}`)
  }
  lines.push(`入会链接：${opts.meeting.url}`)
  if (opts.meeting.password) {
    lines.push(`会议密码：${opts.meeting.password}`)
  }
  return lines.join("\n")
}
