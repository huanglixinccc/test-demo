import { describe, it, expect, vi } from "vitest"
import { isAnalyticsIntent, parseAnalyticsQuery } from "../../src/agents/analytics/query.js"

describe("analytics query", () => {
  it("isAnalyticsIntent matches funnel keywords", () => {
    expect(isAnalyticsIntent("本月前端岗位漏斗情况")).toBe(true)
    expect(isAnalyticsIntent("招聘统计")).toBe(true)
    expect(isAnalyticsIntent("内推 张三\n姓名:张三")).toBe(false)
    expect(isAnalyticsIntent("张三 138 react")).toBe(false)
  })

  it("parseAnalyticsQuery extracts position and period from LLM JSON", async () => {
    const ai = {
      chat: vi.fn().mockResolvedValue('{"position":"前端","period":"last_month"}'),
    }
    const out = await parseAnalyticsQuery(ai, "上月前端漏斗")
    expect(out).toEqual({ position: "前端", period: "last_month" })
  })

  it("parseAnalyticsQuery tolerates JSON embedded in text", async () => {
    const ai = {
      chat: vi.fn().mockResolvedValue('结果：{"position":null,"period":"all"}'),
    }
    const out = await parseAnalyticsQuery(ai, "全部招聘漏斗")
    expect(out).toEqual({ position: null, period: "all" })
  })
})
