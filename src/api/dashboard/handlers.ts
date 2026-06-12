import type { AIProvider } from "../../ai/provider.js"
import type {
  BitableTables,
  BitableRecord,
  CandidateFields,
  InterviewFields,
} from "../../feishu/bitable.js"
import { runJdMatchForCandidate } from "../../agents/jdMatch/index.js"
import type { JdMatchResult } from "../../agents/jdMatch/score.js"
import { computeFunnel, filterCandidates } from "../../agents/analytics/funnel.js"
import {
  CANDIDATE_STATUS_VALUES,
  isCandidateStatus,
  normalizeBitableFieldValue,
  normalizeBitableTimestamp,
} from "../../feishu/bitableFields.js"
import type { FeishuVC } from "../../feishu/vc.js"
import {
  MEETING_DURATION_SEC,
  buildMeetingClipboardText,
} from "../../feishu/vc.js"
import { normalizeOpenId } from "../../feishu/bitableFields.js"
import type {
  DashboardCandidateDto,
  DashboardInterviewDto,
  DashboardQuery,
  DashboardReferralDto,
  MeetingLinkResponse,
  UpcomingInterviewDto,
  UpcomingPeriod,
} from "./types.js"
import { getPeriodRange } from "./upcoming.js"
import { computeChannelStats } from "./channels.js"
import type { ChannelStatsResult } from "./channels.js"
import {
  BossDraftError,
  buildBossInterviewDraftMessage,
  fillBossChatDraft,
  isBossResumeSource,
} from "../../outreach/boss/index.js"

function toCandidateDto(record: BitableRecord<CandidateFields>): DashboardCandidateDto {
  const f = record.fields
  return {
    recordId: record.record_id,
    candidateId: normalizeBitableFieldValue(f.candidateId) ?? "",
    name: normalizeBitableFieldValue(f.name) ?? null,
    position: normalizeBitableFieldValue(f.position) ?? null,
    phone: normalizeBitableFieldValue(f.phone) ?? null,
    email: normalizeBitableFieldValue(f.email) ?? null,
    skills: Array.isArray(f.skills) ? f.skills.map(String) : [],
    resumeSource: normalizeBitableFieldValue(f.resumeSource) ?? "",
    resumeUrl: f.resumeUrl ?? null,
    platformChatUrl: normalizeBitableFieldValue(f.platformChatUrl) ?? null,
    status: normalizeBitableFieldValue(f.status) ?? "待筛选",
    matchScore: f.matchScore ?? null,
    priority: (f.priority as string | null) ?? null,
    rejectReason: normalizeBitableFieldValue(f.rejectReason) ?? null,
    createdAt:
      normalizeBitableTimestamp(f.createdAt) ??
      normalizeBitableTimestamp(record.created_time) ??
      0,
  }
}

function applySearch(
  records: BitableRecord<CandidateFields>[],
  search?: string,
): BitableRecord<CandidateFields>[] {
  if (!search?.trim()) return records
  const q = search.trim().toLowerCase()
  return records.filter((r) => {
    const name = (normalizeBitableFieldValue(r.fields.name) ?? "").toLowerCase()
    return name.includes(q)
  })
}

export async function listCandidates(
  bitable: BitableTables,
  query: DashboardQuery,
): Promise<DashboardCandidateDto[]> {
  const all = await bitable.listAllCandidates()
  const filtered = filterCandidates(all, {
    position: query.position ?? null,
    startTime: query.startTime,
    endTime: query.endTime,
  })
  return applySearch(filtered, query.search).map(toCandidateDto)
}

function toInterviewDto(record: BitableRecord<InterviewFields>): DashboardInterviewDto {
  const f = record.fields
  return {
    recordId: record.record_id,
    interviewId: normalizeBitableFieldValue(f.interviewId),
    interviewerName: normalizeBitableFieldValue(f.interviewerName),
    interviewerOpenId: normalizeOpenId(f.interviewerOpenId),
    interviewTime: f.interviewTime,
    interviewStatus: normalizeBitableFieldValue(f.interviewStatus),
    reviewResult: normalizeBitableFieldValue(f.reviewResult) ?? null,
    reviewContent: normalizeBitableFieldValue(f.reviewContent) ?? "",
    meetingUrl: normalizeBitableFieldValue(f.meetingUrl) ?? null,
    exceptionType: normalizeBitableFieldValue(f.exceptionType) ?? null,
    exceptionStatus: normalizeBitableFieldValue(f.exceptionStatus) ?? null,
    escalationLevel: f.escalationLevel ?? null,
    exceptionNote: normalizeBitableFieldValue(f.exceptionNote) ?? null,
  }
}

export async function getCandidateDetail(
  bitable: BitableTables,
  recordId: string,
): Promise<{
  candidate: DashboardCandidateDto
  interviews: DashboardInterviewDto[]
  referral: DashboardReferralDto | null
}> {
  const record = await bitable.getCandidate(recordId)
  const candidate = toCandidateDto(record)
  const interviews = await bitable.findInterviewsByCandidateId(candidate.candidateId)
  const referralRow = await bitable.findReferralByCandidateId(candidate.candidateId)
  const referral: DashboardReferralDto | null = referralRow
    ? {
        referrerName: normalizeBitableFieldValue(referralRow.fields.referrerName) ?? "",
        referrerOpenId: normalizeOpenId(referralRow.fields.referrerOpenId) ?? "",
        referralTime:
          normalizeBitableTimestamp(referralRow.fields.referralTime) ??
          normalizeBitableTimestamp(referralRow.created_time) ??
          0,
        currentStatus: normalizeBitableFieldValue(referralRow.fields.currentStatus) ?? "",
      }
    : null
  return {
    candidate,
    interviews: interviews.map(toInterviewDto),
    referral,
  }
}

export class JdMatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "JdMatchError"
  }
}

export async function scoreCandidateJdMatch(
  ai: AIProvider,
  bitable: BitableTables,
  recordId: string,
  force = false,
): Promise<{ candidate: DashboardCandidateDto; match: JdMatchResult | null }> {
  const before = await bitable.getCandidate(recordId)
  const match = await runJdMatchForCandidate({ ai, bitable }, recordId, { force })
  const after = await bitable.getCandidate(recordId)

  if (!match && after.fields.matchScore == null) {
    const position = normalizeBitableFieldValue(before.fields.position)
    const jd = await bitable.findJdByPosition(position)
    if (!jd) {
      throw new JdMatchError(
        position ? `未找到岗位「${position}」对应的 JD，请先在 JobDescription 表维护` : "候选人未填写岗位，无法匹配 JD",
      )
    }
    throw new JdMatchError("JD 匹配评分失败，请稍后重试")
  }

  return { candidate: toCandidateDto(after), match }
}

export async function updateCandidateStatus(
  bitable: BitableTables,
  recordId: string,
  status: string,
  rejectReason?: string,
): Promise<{ ok: true; status: string }> {
  if (!isCandidateStatus(status)) {
    throw new Error(`Invalid status: ${status}. Allowed: ${CANDIDATE_STATUS_VALUES.join(", ")}`)
  }
  const patch: Partial<CandidateFields> = { status }
  if (status === "淘汰" && rejectReason?.trim()) {
    patch.rejectReason = rejectReason.trim()
  } else if (status !== "淘汰") {
    patch.rejectReason = null
  }
  await bitable.updateCandidate(recordId, patch)
  return { ok: true, status }
}

export async function getFunnel(
  bitable: BitableTables,
  query: DashboardQuery,
) {
  const all = await bitable.listAllCandidates()
  const filtered = filterCandidates(all, {
    position: query.position ?? null,
    startTime: query.startTime,
    endTime: query.endTime,
  })
  const searched = applySearch(filtered, query.search)
  return computeFunnel(searched)
}

export async function getChannelStats(
  bitable: BitableTables,
  query: DashboardQuery,
): Promise<ChannelStatsResult> {
  const all = await bitable.listAllCandidates()
  const filtered = filterCandidates(all, {
    position: query.position ?? null,
    startTime: query.startTime,
    endTime: query.endTime,
  })
  return computeChannelStats(filtered)
}

export class MeetingValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MeetingValidationError"
  }
}

export function isInterviewCompleted(status: string | undefined): boolean {
  return status === "已完成"
}

export type InterviewExceptionAction = "no_show" | "cancel" | "resolve"

export async function reportInterviewException(
  bitable: BitableTables,
  interviewRecordId: string,
  body: { action: InterviewExceptionAction; note?: string },
): Promise<DashboardInterviewDto> {
  const interview = await bitable.getInterview(interviewRecordId)
  const status = normalizeBitableFieldValue(interview.fields.interviewStatus)
  const exceptionStatus = normalizeBitableFieldValue(interview.fields.exceptionStatus)
  const note = body.note?.trim()

  if (body.action === "resolve") {
    const exceptionType = normalizeBitableFieldValue(interview.fields.exceptionType)
    if (!exceptionType || exceptionStatus === "已处理") {
      throw new MeetingValidationError("当前没有待处理的异常")
    }
    await bitable.updateInterview(interviewRecordId, {
      exceptionStatus: "已处理",
      ...(note ? { exceptionNote: note } : {}),
    })
    const updated = await bitable.getInterview(interviewRecordId)
    return toInterviewDto(updated)
  }

  if (isInterviewCompleted(status)) {
    throw new MeetingValidationError("已完成的面试不可标记异常")
  }
  if (exceptionStatus === "待处理") {
    throw new MeetingValidationError("请先处理当前异常，或标记为已处理后再操作")
  }

  if (body.action === "no_show") {
    await bitable.updateInterview(interviewRecordId, {
      exceptionType: "候选人爽约",
      exceptionStatus: "待处理",
      escalationLevel: 3,
      interviewStatus: "已完成",
      ...(note ? { exceptionNote: note } : {}),
    })
  } else if (body.action === "cancel") {
    await bitable.updateInterview(interviewRecordId, {
      exceptionType: "面试官取消",
      exceptionStatus: "待处理",
      escalationLevel: 3,
      interviewStatus: "待安排",
      ...(note ? { exceptionNote: note } : {}),
    })
  } else {
    throw new MeetingValidationError("无效的操作类型")
  }

  const updated = await bitable.getInterview(interviewRecordId)
  return toInterviewDto(updated)
}

export async function updateInterviewFields(
  bitable: BitableTables,
  interviewRecordId: string,
  body: {
    interviewTime?: number
    interviewerName?: string
    interviewerOpenId?: string
  },
): Promise<DashboardInterviewDto> {
  const interview = await bitable.getInterview(interviewRecordId)
  const currentStatus = normalizeBitableFieldValue(interview.fields.interviewStatus)
  if (isInterviewCompleted(currentStatus)) {
    throw new MeetingValidationError("已完成的面试不可编辑")
  }

  const patch: Partial<InterviewFields> = {}
  if (body.interviewTime != null) {
    if (!Number.isFinite(body.interviewTime) || body.interviewTime <= 0) {
      throw new MeetingValidationError("面试时间无效")
    }
    patch.interviewTime = body.interviewTime
  }
  if (body.interviewerName !== undefined) {
    const name = body.interviewerName.trim()
    if (!name) throw new MeetingValidationError("面试官姓名不能为空")
    patch.interviewerName = name
  }
  if (body.interviewerOpenId !== undefined) {
    const openId = normalizeOpenId(body.interviewerOpenId) ?? body.interviewerOpenId.trim()
    if (!openId) throw new MeetingValidationError("面试官 open_id 无效")
    patch.interviewerOpenId = openId
  }

  if (Object.keys(patch).length === 0) {
    throw new MeetingValidationError("没有可更新的字段")
  }

  await bitable.updateInterview(interviewRecordId, patch)
  const updated = await bitable.getInterview(interviewRecordId)
  return toInterviewDto(updated)
}

export async function createInterviewMeeting(
  bitable: BitableTables,
  vc: FeishuVC,
  interviewRecordId: string,
  fallbackOwnerId: string,
  opts?: { topic?: string },
): Promise<MeetingLinkResponse> {
  const interview = await bitable.getInterview(interviewRecordId)
  const f = interview.fields

  const interviewStatus = normalizeBitableFieldValue(f.interviewStatus)
  if (isInterviewCompleted(interviewStatus)) {
    throw new MeetingValidationError("已完成的面试不可创建会议链接")
  }

  const interviewTime = normalizeBitableTimestamp(f.interviewTime)
  const candidateName = normalizeBitableFieldValue(f.candidateName)
  const interviewerName = normalizeBitableFieldValue(f.interviewerName)
  const interviewerOpenId = normalizeOpenId(f.interviewerOpenId)
  const candidateId = normalizeBitableFieldValue(f.candidateId)

  if (!interviewTime || interviewTime <= 0) {
    throw new MeetingValidationError("请先在 Bitable 填写面试时间")
  }
  if (!interviewerName) {
    throw new MeetingValidationError("请先在 Bitable 填写面试官姓名")
  }
  if (!interviewerOpenId) {
    throw new MeetingValidationError("请先在 Bitable 填写面试官 open_id")
  }
  if (!candidateName) {
    throw new MeetingValidationError("面试记录缺少候选人姓名")
  }

  const existingUrl = normalizeBitableFieldValue(f.meetingUrl)
  if (existingUrl) {
    let position = "未指定职位"
    if (candidateId) {
      const candidate = await bitable.findCandidateByCandidateId(candidateId)
      position = normalizeBitableFieldValue(candidate?.fields.position) ?? position
    }
    const clipboardText = buildMeetingClipboardText({
      candidateName,
      position,
      interviewerName,
      interviewTimeMs: interviewTime,
      meeting: {
        id: "",
        meetingNo: "",
        url: existingUrl,
        appLink: existingUrl,
        endTime: "",
      },
    })
    return {
      clipboardText,
      fromCache: true,
      meeting: {
        url: existingUrl,
        meetingNo: "",
        appLink: existingUrl,
      },
    }
  }

  let position = "未指定职位"
  if (candidateId) {
    const candidate = await bitable.findCandidateByCandidateId(candidateId)
    position = normalizeBitableFieldValue(candidate?.fields.position) ?? position
  }

  const timeLabel = new Date(interviewTime).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const topic =
    opts?.topic?.trim() ||
    `面试｜${candidateName}｜${position}｜${timeLabel}`

  const endTimeSec = Math.floor(interviewTime / 1000) + MEETING_DURATION_SEC
  const ownerId = interviewerOpenId || fallbackOwnerId

  const meeting = await vc.createReserve({
    topic,
    ownerId,
    endTimeSec,
    hostIds: [interviewerOpenId],
  })

  await bitable.updateInterview(interviewRecordId, { meetingUrl: meeting.url })

  const clipboardText = buildMeetingClipboardText({
    candidateName,
    position,
    interviewerName,
    interviewTimeMs: interviewTime,
    meeting,
  })

  return {
    clipboardText,
    fromCache: false,
    meeting: {
      url: meeting.url,
      meetingNo: meeting.meetingNo,
      password: meeting.password,
      appLink: meeting.appLink,
    },
  }
}

export async function listUpcomingInterviews(
  bitable: BitableTables,
  period: UpcomingPeriod,
): Promise<UpcomingInterviewDto[]> {
  const { start, end } = getPeriodRange(period)
  const all = await bitable.listAllInterviews()
  const candidates = await bitable.listAllCandidates()
  const candidateById = new Map(
    candidates.map((c) => [
      normalizeBitableFieldValue(c.fields.candidateId) ?? "",
      c,
    ]),
  )

  const items: UpcomingInterviewDto[] = []
  for (const row of all) {
    const f = row.fields
    const t = normalizeBitableTimestamp(f.interviewTime)
    if (!t || t < start || t >= end) continue
    const status = normalizeBitableFieldValue(f.interviewStatus)
    if (status === "已完成") continue

    const candidateId = normalizeBitableFieldValue(f.candidateId) ?? ""
    const cand = candidateById.get(candidateId)
    items.push({
      interviewRecordId: row.record_id,
      candidateId,
      candidateRecordId: cand?.record_id,
      candidateName:
        normalizeBitableFieldValue(f.candidateName) ??
        normalizeBitableFieldValue(cand?.fields.name) ??
        "未命名",
      position: normalizeBitableFieldValue(cand?.fields.position) ?? "职位未填",
      interviewerName: normalizeBitableFieldValue(f.interviewerName) ?? "面试官未填",
      interviewTime: t,
      interviewStatus: status ?? "待安排",
      meetingUrl: normalizeBitableFieldValue(f.meetingUrl) ?? null,
    })
  }

  items.sort((a, b) => a.interviewTime - b.interviewTime)
  return items
}

export interface BossDraftResponse {
  status: "filled"
  draftText: string
  chatUrl: string
  message: string
  inputSelector: string
}

export async function prepareBossInterviewDraft(
  bitable: BitableTables,
  interviewRecordId: string,
  opts: { chatUrl?: string; profileDir: string; cdpPort: number },
): Promise<BossDraftResponse> {
  const interview = await bitable.getInterview(interviewRecordId)
  const f = interview.fields
  const candidateId = normalizeBitableFieldValue(f.candidateId)
  if (!candidateId) {
    throw new BossDraftError("面试记录未关联候选人，无法预填 Boss 话术")
  }

  const candidate = await bitable.findCandidateByCandidateId(candidateId)
  if (!candidate) {
    throw new BossDraftError("未找到对应候选人记录")
  }

  const resumeSource = normalizeBitableFieldValue(candidate.fields.resumeSource)
  if (!isBossResumeSource(resumeSource)) {
    throw new BossDraftError("仅支持简历来源为 Boss直聘 的候选人")
  }

  const chatUrl =
    opts.chatUrl?.trim() ||
    normalizeBitableFieldValue(candidate.fields.platformChatUrl) ||
    ""
  if (!chatUrl) {
    throw new BossDraftError(
      "请在候选人表填写 platformChatUrl（Boss 私信会话页完整链接）",
    )
  }

  const draftText = buildBossInterviewDraftMessage({
    candidateName:
      normalizeBitableFieldValue(f.candidateName) ??
      normalizeBitableFieldValue(candidate.fields.name) ??
      null,
    position: normalizeBitableFieldValue(candidate.fields.position) ?? null,
    interviewTime: f.interviewTime,
    interviewerName: normalizeBitableFieldValue(f.interviewerName) ?? null,
    meetingUrl: normalizeBitableFieldValue(f.meetingUrl) ?? null,
  })

  const result = await fillBossChatDraft({
    chatUrl,
    message: draftText,
    profileDir: opts.profileDir,
    cdpPort: opts.cdpPort,
  })

  return {
    status: "filled",
    draftText,
    chatUrl: result.chatUrl,
    inputSelector: result.inputSelector,
    message: "已打开 Boss 对话框并填入话术，请人工核对后点击发送（系统不会自动发送）",
  }
}
