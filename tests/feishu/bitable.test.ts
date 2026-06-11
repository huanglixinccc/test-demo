import { describe, it, expect, vi } from "vitest"
import { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuClient } from "../../src/feishu/client.js"

function fakeClient(handler: (m: string, p: string, opts?: any) => Promise<any>): FeishuClient {
  return { request: vi.fn(handler) } as unknown as FeishuClient
}

const tables = { candidate: "tCand", interview: "tIv", referral: "tRef", jd: "tJd" }

describe("BitableTables", () => {
  it("createCandidate POSTs to candidate table /records and returns record", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      return { record: { record_id: "rec_1", fields: opts.data.fields } }
    })
    const t = new BitableTables(client, "appT", tables)
    const out = await t.createCandidate({
      candidateId: "c1",
      name: "张三",
      position: "前端",
      phone: "138",
      email: null,
      skills: ["React"],
      resumeSource: "飞书机器人",
      status: "待筛选",
      createdAt: 1,
    })
    expect(out.record_id).toBe("rec_1")
    expect(calls[0].m).toBe("POST")
    expect(calls[0].p).toBe("/open-apis/bitable/v1/apps/appT/tables/tCand/records")
    expect(calls[0].opts.data.fields.name).toBe("张三")
  })

  it("findCandidateByCandidateId searches with text-equals filter", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      return { items: [{ record_id: "rec_c", fields: { candidateId: "c1" } }] }
    })
    const t = new BitableTables(client, "appT", tables)
    const out = await t.findCandidateByCandidateId("c1")
    expect(out?.record_id).toBe("rec_c")
    expect(calls[0].p).toContain("/records/search")
    expect(calls[0].opts.data.filter.conditions[0]).toEqual({
      field_name: "candidateId",
      operator: "is",
      value: ["c1"],
    })
  })

  it("listInterviewsNeedingReminder filters in-memory", async () => {
    const now = 1_000_000_000_000
    const oldEnough = now - 2 * 60 * 60 * 1000
    const tooRecent = now - 30 * 60 * 1000

    const client = fakeClient(async () => ({
      items: [
        { record_id: "r1", fields: { interviewTime: oldEnough, reviewContent: "", notificationStatus: "已通知" } },
        { record_id: "r2", fields: { interviewTime: tooRecent, reviewContent: "", notificationStatus: "已通知" } },
        { record_id: "r3", fields: { interviewTime: oldEnough, reviewContent: "hi", notificationStatus: "已通知" } },
        { record_id: "r4", fields: { interviewTime: oldEnough, reviewContent: "", notificationStatus: "已提醒面评" } },
      ],
    }))

    const t = new BitableTables(client, "appT", tables)
    const out = await t.listInterviewsNeedingReminder(now)
    expect(out.map((r) => r.record_id)).toEqual(["r1"])
  })
})
