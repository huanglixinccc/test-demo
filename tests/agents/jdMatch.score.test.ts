import { describe, it, expect, vi } from "vitest"
import type { AIProvider } from "../../src/ai/provider.js"
import { scoreCandidateAgainstJd, scoreToPriority } from "../../src/agents/jdMatch/score.js"

describe("jdMatch score", () => {
  it("scoreToPriority maps thresholds", () => {
    expect(scoreToPriority(90)).toBe("高")
    expect(scoreToPriority(70)).toBe("中")
    expect(scoreToPriority(40)).toBe("低")
  })

  it("parses LLM JSON and normalizes score", async () => {
    const ai: AIProvider = {
      chat: vi.fn().mockResolvedValue(
        JSON.stringify({
          score: 88.6,
          priority: "高",
          highlights: ["Java"],
          gaps: ["K8s"],
        }),
      ),
    }

    const result = await scoreCandidateAgainstJd(
      ai,
      { name: "张三", position: "后端工程师", skills: ["Java", "MySQL"] },
      { position: "后端工程师", requirement: "熟悉 Java、Spring" },
    )

    expect(result.score).toBe(89)
    expect(result.priority).toBe("高")
    expect(result.highlights).toEqual(["Java"])
  })
})
