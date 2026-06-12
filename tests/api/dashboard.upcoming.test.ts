import { describe, it, expect } from "vitest"
import { getPeriodRange } from "../../src/api/dashboard/upcoming.js"

describe("getPeriodRange", () => {
  it("today spans 24 hours from midnight", () => {
    const { start, end } = getPeriodRange("today")
    expect(end - start).toBe(24 * 60 * 60 * 1000)
  })

  it("week spans 7 days", () => {
    const { start, end } = getPeriodRange("week")
    expect(end - start).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
