import type { BitableRecord, CandidateFields } from "../../feishu/bitable.js"
import { computeFunnel } from "../../agents/analytics/funnel.js"
import { normalizeBitableFieldValue } from "../../feishu/bitableFields.js"

export interface ChannelStatRow {
  channel: string
  resume: number
  screen: number
  interview: number
  offer: number
  onboard: number
  screenRate: number
  interviewRate: number
  offerRate: number
  onboardRate: number
}

export interface ChannelStatsResult {
  items: ChannelStatRow[]
  total: ChannelStatRow
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

function toRow(channel: string, records: BitableRecord<CandidateFields>[]): ChannelStatRow {
  const funnel = computeFunnel(records)
  return {
    channel,
    ...funnel,
    screenRate: rate(funnel.screen, funnel.resume),
    interviewRate: rate(funnel.interview, funnel.resume),
    offerRate: rate(funnel.offer, funnel.resume),
    onboardRate: rate(funnel.onboard, funnel.resume),
  }
}

export function computeChannelStats(
  records: BitableRecord<CandidateFields>[],
): ChannelStatsResult {
  const byChannel = new Map<string, BitableRecord<CandidateFields>[]>()

  for (const record of records) {
    const channel = normalizeBitableFieldValue(record.fields.resumeSource) ?? "未标记"
    const list = byChannel.get(channel) ?? []
    list.push(record)
    byChannel.set(channel, list)
  }

  const items = [...byChannel.entries()]
    .map(([channel, recs]) => toRow(channel, recs))
    .sort((a, b) => b.resume - a.resume || a.channel.localeCompare(b.channel, "zh-CN"))

  const total = toRow("全部渠道", records)

  return { items, total }
}
