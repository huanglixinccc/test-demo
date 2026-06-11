import type { FunnelStats } from "./funnel.js"

export function buildFunnelReplyText(opts: {
  stats: FunnelStats
  position: string | null
  periodLabel: string
}): string {
  const scope = opts.position ? `${opts.position} · ` : ""
  const { stats: s } = opts
  return [
    `【招聘漏斗】${scope}${opts.periodLabel}`,
    "",
    `收到简历：${s.resume}`,
    `初筛通过：${s.screen}`,
    `技术面：${s.interview}`,
    `Offer：${s.offer}`,
    `入职：${s.onboard}`,
  ].join("\n")
}
