import { describe, it, expect } from "vitest"
import { computeChannelStats } from "../../src/api/dashboard/channels.js"
import type { BitableRecord, CandidateFields } from "../../src/feishu/bitable.js"

function cand(
  source: string,
  status: CandidateFields["status"],
): BitableRecord<CandidateFields> {
  return {
    record_id: `rec_${Math.random()}`,
    fields: {
      candidateId: "c1",
      name: "测试",
      position: "后端工程师",
      phone: null,
      email: null,
      skills: [],
      resumeSource: source,
      status,
      createdAt: Date.now(),
    },
  }
}

describe("computeChannelStats", () => {
  it("groups by resumeSource and computes conversion rates", () => {
    const records = [
      cand("内推", "待筛选"),
      cand("内推", "技术面"),
      cand("内推", "入职"),
      cand("Boss直聘", "待筛选"),
      cand("Boss直聘", "淘汰"),
    ]

    const result = computeChannelStats(records)
    expect(result.items).toHaveLength(2)

    const referral = result.items.find((r) => r.channel === "内推")!
    expect(referral.resume).toBe(3)
    expect(referral.interview).toBe(2)
    expect(referral.onboard).toBe(1)
    expect(referral.onboardRate).toBe(33.3)

    const boss = result.items.find((r) => r.channel === "Boss直聘")!
    expect(boss.resume).toBe(2)
    expect(boss.screenRate).toBe(0)

    expect(result.total.resume).toBe(5)
    expect(result.total.onboard).toBe(1)
  })

  it("puts unknown source into 未标记", () => {
    const result = computeChannelStats([
      {
        record_id: "rec_x",
        fields: {
          candidateId: "c2",
          name: null,
          position: null,
          phone: null,
          email: null,
          skills: [],
          resumeSource: "" as unknown as string,
          status: "待筛选",
          createdAt: Date.now(),
        },
      },
    ])
    expect(result.items[0]?.channel).toBe("未标记")
  })
})
