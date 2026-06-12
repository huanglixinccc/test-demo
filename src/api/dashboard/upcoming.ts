import type { UpcomingPeriod } from "./types.js"

export function getPeriodRange(period: UpcomingPeriod): { start: number; end: number } {
  const now = new Date()
  if (period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start: start.getTime(), end: end.getTime() }
  }
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start: start.getTime(), end: end.getTime() }
}
