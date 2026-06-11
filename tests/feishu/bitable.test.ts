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

  it("createReferral POSTs to referral table /records", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      return { record: { record_id: "rec_r", fields: opts.data.fields } }
    })
    const t = new BitableTables(client, "appT", tables)
    const out = await t.createReferral({
      candidateId: "c1",
      candidateName: "张三",
      referrerName: "推荐人",
      referrerOpenId: "ou_x",
      referralTime: 1,
      currentStatus: "待筛选",
    })
    expect(out.record_id).toBe("rec_r")
    expect(calls[0].p).toBe("/open-apis/bitable/v1/apps/appT/tables/tRef/records")
    expect(calls[0].opts.data.fields.referrerOpenId).toBe("ou_x")
  })

  it("createInterview POSTs to interview table /records", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      return { record: { record_id: "rec_iv", fields: opts.data.fields } }
    })
    const t = new BitableTables(client, "appT", tables)
    const out = await t.createInterview({
      candidateId: "c1",
      candidateName: "张三",
      interviewStatus: "待安排",
      notificationStatus: "未通知",
    })
    expect(out.record_id).toBe("rec_iv")
    expect(calls[0].p).toBe("/open-apis/bitable/v1/apps/appT/tables/tIv/records")
  })

  it("findOpenInterviewByCandidateId returns non-completed interview", async () => {
    const client = fakeClient(async () => ({
      items: [
        { record_id: "done", fields: { candidateId: "c1", interviewStatus: "已完成" } },
        { record_id: "open", fields: { candidateId: "c1", interviewStatus: "待安排" } },
      ],
    }))
    const t = new BitableTables(client, "appT", tables)
    const out = await t.findOpenInterviewByCandidateId("c1")
    expect(out?.record_id).toBe("open")
  })

  it("findReferralByCandidateId searches by candidateId", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      return { items: [{ record_id: "rec_r", fields: { candidateId: "c1" } }] }
    })
    const t = new BitableTables(client, "appT", tables)
    const out = await t.findReferralByCandidateId("c1")
    expect(out?.record_id).toBe("rec_r")
    expect(calls[0].p).toContain("/tRef/records/search")
  })

  it("getCandidate GETs candidate row", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p) => {
      calls.push({ m, p })
      return { record: { record_id: "rec_c", fields: { candidateId: "c1", name: "张三", status: "技术面" } } }
    })
    const t = new BitableTables(client, "appT", tables)
    const out = await t.getCandidate("rec_c")
    expect(out.fields.name).toBe("张三")
    expect(calls[0].m).toBe("GET")
    expect(calls[0].p).toBe("/open-apis/bitable/v1/apps/appT/tables/tCand/records/rec_c")
  })

  it("listAllCandidates paginates search results", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      if (calls.length === 1) {
        return {
          items: [{ record_id: "c1", fields: { candidateId: "c1" } }],
          has_more: true,
          page_token: "tok2",
        }
      }
      return {
        items: [{ record_id: "c2", fields: { candidateId: "c2" } }],
        has_more: false,
      }
    })
    const t = new BitableTables(client, "appT", tables)
    const out = await t.listAllCandidates()
    expect(out.map((r) => r.record_id)).toEqual(["c1", "c2"])
    expect(calls).toHaveLength(2)
    expect(calls[0].opts.data.page_size).toBe(500)
    expect(calls[1].opts.data.page_token).toBe("tok2")
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
