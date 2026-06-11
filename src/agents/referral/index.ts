import { v4 as uuid } from "uuid"
import type { AIProvider } from "../../ai/provider.js"
import type { BitableTables } from "../../feishu/bitable.js"
import type { FeishuIM } from "../../feishu/im.js"
import { normalizeBitableFieldValue, normalizeOpenId, sleep } from "../../feishu/bitableFields.js"
import { bus } from "../../events/bus.js"
import { parseResume, hasAnyKeyField, type ParsedResume } from "../resume/parse.js"
import { buildReferralReplyCard, buildReferralStatusUpdateText } from "./notify.js"
import { logger } from "../../utils/logger.js"

export interface ReferralAgentDeps {
  ai: AIProvider
  bitable: BitableTables
  im: FeishuIM
}

export function registerReferralAgent(deps: ReferralAgentDeps): void {
  bus.on("ReferralReceived", async (payload) => {
    let parsed: ParsedResume
    try {
      parsed = await parseResume(deps.ai, payload.text)
    } catch (err) {
      logger.error({ err }, "referralAgent.parse_failed")
      await deps.im.sendTextToUser(
        payload.senderOpenId,
        "未能解析内推信息，请按以下格式重发：\n内推 + 姓名/岗位/电话/邮箱",
      )
      return
    }

    if (!hasAnyKeyField(parsed)) {
      await deps.im.sendTextToUser(
        payload.senderOpenId,
        "未识别到候选人姓名/联系方式，请补全内推信息",
      )
      return
    }

    const referrerName = await tryResolveSenderName(deps, payload.senderOpenId)
    const candidateId = uuid()
    const now = Date.now()

    try {
      await deps.bitable.createCandidate({
        candidateId,
        name: parsed.name,
        position: parsed.position,
        phone: parsed.phone,
        email: parsed.email,
        skills: parsed.skills,
        resumeSource: "内推",
        status: "待筛选",
        createdAt: now,
      })
    } catch (err) {
      logger.error({ err }, "referralAgent.candidate_create_failed")
      await deps.im.sendTextToUser(
        payload.senderOpenId,
        "候选人入库失败，请联系管理员（提示：检查 Candidate.resumeSource 是否包含「内推」选项）",
      )
      return
    }

    try {
      await deps.bitable.createReferral({
        candidateId,
        candidateName: parsed.name ?? "(未命名)",
        referrerName,
        referrerOpenId: payload.senderOpenId,
        referralTime: now,
        currentStatus: "待筛选",
      })
    } catch (err) {
      // Candidate already created; warn but don't roll back. Referral row can be
      // manually added later or via retry; better than failing the whole flow.
      logger.error({ err }, "referralAgent.referral_create_failed")
      await deps.im.sendTextToUser(
        payload.senderOpenId,
        `候选人已入库（ID=${candidateId}），但建立内推关系失败，请联系管理员`,
      )
      return
    }

    const card = buildReferralReplyCard({ candidateId, parsed })
    try {
      await deps.im.sendCardToUser(payload.senderOpenId, card)
    } catch {
      await deps.im.sendTextToUser(
        payload.senderOpenId,
        `已收到您的内推：${parsed.name ?? "(无名)"} / ${parsed.position ?? "(未填岗位)"}`,
      )
    }
  })

  bus.on("CandidateStatusChanged", async (payload) => {
    let referral
    try {
      referral = await deps.bitable.findReferralByCandidateId(payload.candidateId)
    } catch (err) {
      logger.error({ err, candidateId: payload.candidateId }, "referralAgent.find_referral_failed")
      return
    }
    if (!referral) {
      logger.info({ candidateId: payload.candidateId }, "referralAgent.no_referral_skip")
      return
    }

    let status = normalizeBitableFieldValue(payload.status) ?? payload.status
    let candidateName = payload.candidateName || referral.fields.candidateName || "候选人"
    const previousStatus = normalizeBitableFieldValue(referral.fields.currentStatus)
      ?? referral.fields.currentStatus

    if (previousStatus === status) {
      // Webhook + GET record can race: event arrives before Bitable read model catches up.
      await sleep(800)
      try {
        const fresh = await deps.bitable.findCandidateByCandidateId(payload.candidateId)
        const freshStatus = normalizeBitableFieldValue(fresh?.fields.status)
        if (freshStatus && freshStatus !== previousStatus) {
          status = freshStatus
          candidateName = normalizeBitableFieldValue(fresh?.fields.name) ?? candidateName
        }
      } catch (err) {
        logger.error({ err, candidateId: payload.candidateId }, "referralAgent.refetch_failed")
      }
    }

    if (previousStatus === status) {
      logger.info({ candidateId: payload.candidateId, status }, "referralAgent.status_unchanged_skip")
      return
    }

    const referrerOpenId = normalizeOpenId(referral.fields.referrerOpenId)
    if (!referrerOpenId) {
      logger.error(
        {
          candidateId: payload.candidateId,
          rawReferrerOpenId: referral.fields.referrerOpenId,
        },
        "referralAgent.invalid_referrer_open_id",
      )
      return
    }

    const text = buildReferralStatusUpdateText({ candidateName, status })
    try {
      logger.info(
        {
          candidateId: payload.candidateId,
          referrerOpenId,
          from: previousStatus,
          to: status,
        },
        "referralAgent.notify",
      )
      await deps.im.sendTextToUser(referrerOpenId, text)
    } catch (err) {
      logger.error({ err, referrerOpenId }, "referralAgent.notify_failed")
      return
    }

    try {
      await deps.bitable.updateReferral(referral.record_id, { currentStatus: status })
    } catch (err) {
      logger.error({ err }, "referralAgent.update_referral_failed")
    }
  })
}

async function tryResolveSenderName(
  deps: ReferralAgentDeps,
  openId: string,
): Promise<string> {
  // We only have the bot scope; resolving real names requires contact:user.id.read
  // and a contact API call. Keep this trivial for the MVP — UX cost of an
  // anonymous referrer is low ("推荐人 ou_xxx" → display short form).
  if (typeof deps === "object" && deps && "im" in deps) {
    // Reserved for future expansion (e.g., contact lookup via deps.im.client).
  }
  return openId.length > 10 ? `推荐人(${openId.slice(0, 8)}…)` : `推荐人(${openId})`
}
