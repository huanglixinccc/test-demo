import { describe, it, expect, vi } from "vitest"
import express from "express"
import request from "supertest"
import { createPositionContextRouter } from "../../src/api/positionContext/router.js"
import type { FeishuIM } from "../../src/feishu/im.js"

function fakeIm(): FeishuIM {
  return {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    downloadMessageFile: vi.fn(),
  } as unknown as FeishuIM
}

function appWithRouter(im: FeishuIM, defaultOpenIds: string[] = []) {
  const app = express()
  app.use(express.json())
  app.use("/api/position-context", createPositionContextRouter({ im, defaultOpenIds }))
  return app
}

describe("POST /api/position-context/manual-clarification", () => {
  it("triggers clarification card for specified users", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app)
      .post("/api/position-context/manual-clarification")
      .send({ positionName: "HRBP", openIds: ["ou_hr"] })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      positionName: "HRBP",
      sent: ["ou_hr"],
      failed: [],
    })
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "您有一个新职位【HRBP】待澄清" }),
        }),
      }),
    )
  })

  it("uses default openIds when request body omits them", async () => {
    const im = fakeIm()
    const app = appWithRouter(im, ["ou_default"])

    const res = await request(app)
      .post("/api/position-context/manual-clarification")
      .send({ positionName: "产品经理" })

    expect(res.status).toBe(200)
    expect(res.body.sent).toEqual(["ou_default"])
  })

  it("returns 400 when positionName is missing", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app)
      .post("/api/position-context/manual-clarification")
      .send({ openIds: ["ou_hr"] })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })
})
