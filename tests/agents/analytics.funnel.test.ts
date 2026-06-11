import { describe, it, expect } from "vitest"
import { computeFunnel, filterCandidates } from "../../src/agents/analytics/funnel.js"
import type { BitableRecord, CandidateFields } from "../../src/feishu/bitable.js"

function rec(
  fields: Partial<CandidateFields>,
  id = "r1",
): BitableRecord<CandidateFields> {
  return { record_id: id, fields: fields as CandidateFields }
}

describe("analytics funnel", () => {
  it("computeFunnel counts cumulative stages", () => {
    const records = [
      rec({ status: "待筛选" }),
      rec({ status: "初筛通过" }, "r2"),
      rec({ status: "技术面" }, "r3"),
      rec({ status: "HR面" }, "r4"),
      rec({ status: "Offer" }, "r5"),
      rec({ status: "入职" }, "r6"),
      rec({ status: "淘汰" }, "r7"),
      rec({ status: "" }, "r8"),
    ]
    expect(computeFunnel(records)).toEqual({
      resume: 7,
      screen: 5,
      interview: 4,
      offer: 2,
      onboard: 1,
    })
  })

  it("filterCandidates by position and createdAt", () => {
    const records = [
      rec({ position: "前端工程师", createdAt: 100, status: "待筛选" }),
      rec({ position: "后端开发", createdAt: 200, status: "待筛选" }, "r2"),
      rec({ position: "前端", createdAt: 50, status: "待筛选" }, "r3"),
    ]
    const out = filterCandidates(records, {
      position: "前端",
      startTime: 80,
      endTime: 150,
    })
    expect(out.map((r) => r.record_id)).toEqual(["r1"])
  })

  it("filterCandidates uses created_time when createdAt missing", () => {
    const records: BitableRecord<CandidateFields>[] = [
      {
        record_id: "r1",
        created_time: 100,
        fields: { position: "前端", status: "Offer" } as CandidateFields,
      },
    ]
    const out = filterCandidates(records, { startTime: 80, endTime: 150 })
    expect(out).toHaveLength(1)
  })

  it("filterCandidates accepts createdAt in unix seconds", () => {
    const records = [
      rec({ position: "前端", createdAt: 1_750_000_000, status: "待筛选" }),
    ]
    const out = filterCandidates(records, {
      startTime: 1_700_000_000_000,
      endTime: 1_800_000_000_000,
    })
    expect(out).toHaveLength(1)
  })
})
