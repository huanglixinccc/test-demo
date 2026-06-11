import { describe, it, expect, vi, beforeEach } from "vitest"
import { registerAnalyticsAgent } from "../../src/agents/analytics/index.js"
import { bus } from "../../src/events/bus.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuIM } from "../../src/feishu/im.js"

describe("AnalyticsAgent", () => {
  beforeEach(() => bus._resetForTesting())

  it("replies funnel stats on happy path", async () => {
    const ai = {
      chat: vi.fn().mockResolvedValue('{"position":"前端","period":"this_month"}'),
    }
    const listAllCandidates = vi.fn().mockResolvedValue([
      { record_id: "c1", fields: { status: "待筛选", position: "前端", createdAt: Date.now() } },
      { record_id: "c2", fields: { status: "技术面", position: "前端", createdAt: Date.now() } },
    ])
    const bitable = { listAllCandidates } as unknown as BitableTables
    const im = {
      sendTextToUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as FeishuIM

    registerAnalyticsAgent({ ai, bitable, im })
    bus.emit("AnalyticsQueryReceived", {
      text: "本月前端岗位漏斗情况",
      senderOpenId: "ou_hr",
      sourceMessageId: "om_1",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(listAllCandidates).toHaveBeenCalled()
    expect(im.sendTextToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.stringContaining("【招聘漏斗】"),
    )
    expect(im.sendTextToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.stringContaining("收到简历：2"),
    )
  })

  it("warns when parse fails", async () => {
    const ai = {
      chat: vi.fn().mockRejectedValue(new Error("llm down")),
    }
    const bitable = {
      listAllCandidates: vi.fn(),
    } as unknown as BitableTables
    const im = {
      sendTextToUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as FeishuIM

    registerAnalyticsAgent({ ai, bitable, im })
    bus.emit("AnalyticsQueryReceived", {
      text: "???",
      senderOpenId: "ou_hr",
      sourceMessageId: "om_2",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(bitable.listAllCandidates).not.toHaveBeenCalled()
    expect(im.sendTextToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.stringContaining("未能理解"),
    )
  })

  it("warns when listAllCandidates fails", async () => {
    const ai = {
      chat: vi.fn().mockResolvedValue('{"position":null,"period":"all"}'),
    }
    const bitable = {
      listAllCandidates: vi.fn().mockRejectedValue(new Error("bitable down")),
    } as unknown as BitableTables
    const im = {
      sendTextToUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as FeishuIM

    registerAnalyticsAgent({ ai, bitable, im })
    bus.emit("AnalyticsQueryReceived", {
      text: "招聘漏斗",
      senderOpenId: "ou_hr",
      sourceMessageId: "om_3",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(im.sendTextToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.stringContaining("读取候选人数据失败"),
    )
  })
})
