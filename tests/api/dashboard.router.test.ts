import { describe, it, expect, vi } from "vitest"
import request from "supertest"
import express from "express"
import { createDashboardRouter } from "../../src/api/dashboard/router.js"
import type { AIProvider } from "../../src/ai/provider.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuVC } from "../../src/feishu/vc.js"

const mockAi: AIProvider = { chat: vi.fn().mockResolvedValue("ok") }

function makeApp(bitable: BitableTables) {
  const app = express()
  app.use(express.json())
  app.use(
    "/api/dashboard",
    createDashboardRouter({
      bitable,
      vc: { createReserve: vi.fn() } as unknown as FeishuVC,
      meetingOwnerFallback: "ou_hr",
      ai: mockAi,
    }),
  )
  return app
}

describe("dashboard router", () => {
  const bitable = {
    listAllCandidates: vi.fn().mockResolvedValue([]),
    getCandidate: vi.fn(),
    updateCandidate: vi.fn(),
    findInterviewsByCandidateId: vi.fn().mockResolvedValue([]),
  } as unknown as BitableTables

  it("GET /candidates returns items array", async () => {
    const res = await request(makeApp(bitable)).get("/api/dashboard/candidates")
    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })

  it("PATCH /candidates/:id/status returns 400 for invalid status", async () => {
    const res = await request(makeApp(bitable))
      .patch("/api/dashboard/candidates/rec1/status")
      .send({ status: "不存在" })
    expect(res.status).toBe(400)
  })
})
