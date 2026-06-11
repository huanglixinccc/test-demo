import { describe, it, expect } from "vitest"
import { nextCandidateStatus } from "../../src/agents/interview/stateMachine.js"

describe("nextCandidateStatus", () => {
  it("淘汰 → 淘汰 regardless of current", () => {
    expect(nextCandidateStatus("待筛选", "淘汰")).toBe("淘汰")
    expect(nextCandidateStatus("HR面", "淘汰")).toBe("淘汰")
  })

  it("待定 keeps current status", () => {
    expect(nextCandidateStatus("技术面", "待定")).toBe("技术面")
    expect(nextCandidateStatus("Offer", "待定")).toBe("Offer")
  })

  it("通过 from 待筛选/初筛通过 → 技术面", () => {
    expect(nextCandidateStatus("待筛选", "通过")).toBe("技术面")
    expect(nextCandidateStatus("初筛通过", "通过")).toBe("技术面")
  })

  it("通过 from 技术面 → HR面", () => {
    expect(nextCandidateStatus("技术面", "通过")).toBe("HR面")
  })

  it("通过 from HR面 → Offer", () => {
    expect(nextCandidateStatus("HR面", "通过")).toBe("Offer")
  })

  it("terminal states stay put on 通过", () => {
    expect(nextCandidateStatus("Offer", "通过")).toBe("Offer")
    expect(nextCandidateStatus("入职", "通过")).toBe("入职")
  })
})
