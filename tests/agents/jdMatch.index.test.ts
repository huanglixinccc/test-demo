import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AIProvider } from "../../src/ai/provider.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import { bus } from "../../src/events/bus.js"
import { registerJdMatchAgent, runJdMatchForCandidate } from "../../src/agents/jdMatch/index.js"

describe("jdMatch agent", () => {
  beforeEach(() => {
    bus._resetForTesting()
  })

  it("writes matchScore and priority after CandidateCreated", async () => {
    const ai: AIProvider = {
      chat: vi.fn().mockResolvedValue(
        JSON.stringify({ score: 82, priority: "高", highlights: [], gaps: [] }),
      ),
    }
    const bitable = {
      getCandidate: vi.fn().mockResolvedValue({
        record_id: "rec_c1",
        fields: {
          candidateId: "c1",
          name: "王五",
          position: "后端工程师",
          skills: ["Java"],
        },
      }),
      findJdByPosition: vi.fn().mockResolvedValue({
        record_id: "rec_jd1",
        fields: { position: "后端工程师", requirement: "Java 3年+" },
      }),
      updateCandidate: vi.fn().mockResolvedValue(undefined),
    } as unknown as BitableTables

    registerJdMatchAgent({ ai, bitable })
    bus.emit("CandidateCreated", {
      candidateRecordId: "rec_c1",
      candidateId: "c1",
      name: "王五",
      position: "后端工程师",
      skills: ["Java"],
    })
    await new Promise((r) => setImmediate(r))

    expect(bitable.updateCandidate).toHaveBeenCalledWith("rec_c1", {
      matchScore: 82,
      priority: "高",
    })
  })

  it("skips when matchScore already exists", async () => {
    const ai: AIProvider = { chat: vi.fn() }
    const bitable = {
      getCandidate: vi.fn().mockResolvedValue({
        record_id: "rec_c1",
        fields: { candidateId: "c1", position: "后端", matchScore: 70, skills: [] },
      }),
      findJdByPosition: vi.fn(),
      updateCandidate: vi.fn(),
    } as unknown as BitableTables

    const result = await runJdMatchForCandidate({ ai, bitable }, "rec_c1")
    expect(result).toBeNull()
    expect(ai.chat).not.toHaveBeenCalled()
  })
})
