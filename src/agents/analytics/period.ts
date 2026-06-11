export type AnalyticsPeriod = "this_month" | "last_month" | "all"

export function resolvePeriodRange(
  period: AnalyticsPeriod,
  now = Date.now(),
): { startTime?: number; endTime?: number; label: string } {
  if (period === "all") {
    return { label: "全部" }
  }

  const shanghaiMonth = getShanghaiYearMonth(now)
  if (period === "this_month") {
    const start = shanghaiMonthStart(shanghaiMonth.year, shanghaiMonth.month)
    const end = shanghaiMonthStart(shanghaiMonth.year, shanghaiMonth.month + 1) - 1
    return {
      startTime: start,
      endTime: end,
      label: `${shanghaiMonth.year}年${shanghaiMonth.month}月`,
    }
  }

  const prevMonth = shanghaiMonth.month === 1
    ? { year: shanghaiMonth.year - 1, month: 12 }
    : { year: shanghaiMonth.year, month: shanghaiMonth.month - 1 }
  const start = shanghaiMonthStart(prevMonth.year, prevMonth.month)
  const end = shanghaiMonthStart(prevMonth.year, prevMonth.month + 1) - 1
  return {
    startTime: start,
    endTime: end,
    label: `${prevMonth.year}年${prevMonth.month}月`,
  }
}

function getShanghaiYearMonth(ts: number): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(ts))
  const year = Number(parts.find((p) => p.type === "year")?.value)
  const month = Number(parts.find((p) => p.type === "month")?.value)
  return { year, month }
}

function shanghaiMonthStart(year: number, month: number): number {
  const m = month > 12 ? 1 : month
  const y = month > 12 ? year + 1 : year
  const mm = String(m).padStart(2, "0")
  return new Date(`${y}-${mm}-01T00:00:00+08:00`).getTime()
}
