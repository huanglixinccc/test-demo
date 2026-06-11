import type { AIProvider } from "../../ai/provider.js"
import type { BitableTables } from "../../feishu/bitable.js"
import type { FeishuIM } from "../../feishu/im.js"
import { bus } from "../../events/bus.js"
import { computeFunnel, filterCandidates } from "./funnel.js"
import { buildFunnelReplyText } from "./format.js"
import { parseAnalyticsQuery } from "./query.js"
import { resolvePeriodRange } from "./period.js"
import { logger } from "../../utils/logger.js"

export interface AnalyticsAgentDeps {
  ai: AIProvider
  bitable: BitableTables
  im: FeishuIM
}

export function registerAnalyticsAgent(deps: AnalyticsAgentDeps): void {
  bus.on("AnalyticsQueryReceived", async (payload) => {
    let parsed
    try {
      parsed = await parseAnalyticsQuery(deps.ai, payload.text)
    } catch (err) {
      logger.error({ err }, "analyticsAgent.parse_failed")
      await deps.im.sendTextToUser(
        payload.senderOpenId,
        "未能理解您的问题，请试试：\n本月前端岗位漏斗情况",
      )
      return
    }

    const range = resolvePeriodRange(parsed.period)
    let records
    try {
      records = await deps.bitable.listAllCandidates()
    } catch (err) {
      logger.error({ err }, "analyticsAgent.list_failed")
      await deps.im.sendTextToUser(payload.senderOpenId, "读取候选人数据失败，请稍后重试")
      return
    }

    const filtered = filterCandidates(records, {
      position: parsed.position,
      startTime: range.startTime,
      endTime: range.endTime,
    })
    const stats = computeFunnel(filtered)
    const text = buildFunnelReplyText({
      stats,
      position: parsed.position,
      periodLabel: range.label,
    })

    logger.info(
      {
        senderOpenId: payload.senderOpenId,
        position: parsed.position,
        period: parsed.period,
        total: stats.resume,
      },
      "analyticsAgent.reply",
    )

    try {
      await deps.im.sendTextToUser(payload.senderOpenId, text)
    } catch (err) {
      logger.error({ err }, "analyticsAgent.reply_failed")
    }
  })
}
