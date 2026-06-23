import { describe, it, expect, vi } from "vitest"
import express from "express"
import request from "supertest"
import { createPositionContextRouter } from "../../src/api/positionContext/router.js"
import { DEMO_NOTIFICATION_OPEN_ID } from "../../src/modules/positionContext/constants.js"
import type { FeishuIM } from "../../src/feishu/im.js"

function fakeIm(): FeishuIM {
  return {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    downloadMessageFile: vi.fn(),
  } as unknown as FeishuIM
}

function appWithRouter(im: FeishuIM) {
  const app = express()
  app.use(express.json())
  app.use("/api/position-context", createPositionContextRouter({ im }))
  return app
}

describe("POST /api/position-context/*", () => {
  it("triggers clarification card for default demo openId", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app)
      .post("/api/position-context/manual-clarification")
      .send({ positionName: "HRBP" })

    expect(res.status).toBe(200)
    expect(res.body.sent).toEqual([DEMO_NOTIFICATION_OPEN_ID])
  })

  it("triggers recruitment strategy card for default demo openId", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app)
      .post("/api/position-context/manual-recruitment-strategy")
      .send({ positionName: "前端工程师" })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      positionName: "前端工程师",
      sent: [DEMO_NOTIFICATION_OPEN_ID],
      failed: [],
    })
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      DEMO_NOTIFICATION_OPEN_ID,
      expect.objectContaining({
        schema: "2.0",
        body: expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              text: expect.objectContaining({
                content: expect.stringContaining("【前端工程师】寻聘策略已生成"),
              }),
            }),
          ]),
        }),
      }),
    )
  })

  it("sends low screen rate alert", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app).post("/api/position-context/low-screen-rate-alert")

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, openId: DEMO_NOTIFICATION_OPEN_ID })
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      DEMO_NOTIFICATION_OPEN_ID,
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "【HRBP】过筛率预警" }),
        }),
      }),
    )
  })

  it("sends sync position reminder", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app).post("/api/position-context/sync-position-reminder")

    expect(res.status).toBe(200)
    expect(res.body.openId).toBe(DEMO_NOTIFICATION_OPEN_ID)
    expect(JSON.stringify(vi.mocked(im.sendCardToUser).mock.calls[0][1])).toContain("同步职位提醒")
  })

  it("sends first round search confirmation card", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app).post("/api/position-context/first-round-search-confirmation")

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, openId: DEMO_NOTIFICATION_OPEN_ID })
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      DEMO_NOTIFICATION_OPEN_ID,
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({
            content: "【AI 产品经理】首轮寻访已完成，请确认候选人方向",
          }),
        }),
      }),
    )
    expect(JSON.stringify(vi.mocked(im.sendCardToUser).mock.calls[0][1])).toContain(
      "首轮人才寻访",
    )
  })

  it("sends contactable candidate alert card", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app).post("/api/position-context/contactable-candidate-alert")

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, openId: DEMO_NOTIFICATION_OPEN_ID })
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      DEMO_NOTIFICATION_OPEN_ID,
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "有新的可联系候选人，请处理" }),
        }),
      }),
    )
    expect(JSON.stringify(vi.mocked(im.sendCardToUser).mock.calls[0][1])).toContain("李先生")
    expect(JSON.stringify(vi.mocked(im.sendCardToUser).mock.calls[0][1])).toContain(
      "hrp.taient.com/candidate_detail",
    )
  })

  it("sends custom message from frontend payload", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app)
      .post("/api/position-context/custom-message")
      .send({ title: "【自定义】标题", content: "自定义内容" })

    expect(res.status).toBe(200)
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      DEMO_NOTIFICATION_OPEN_ID,
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "【自定义】标题" }),
        }),
      }),
    )
  })

  it("returns 400 when custom message title is missing", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app)
      .post("/api/position-context/custom-message")
      .send({ content: "只有正文" })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
  })

  it("uses custom openId when provided", async () => {
    const im = fakeIm()
    const app = appWithRouter(im)

    const res = await request(app)
      .post("/api/position-context/low-screen-rate-alert")
      .send({ openId: "ou_custom" })

    expect(res.status).toBe(200)
    expect(res.body.openId).toBe("ou_custom")
    expect(im.sendCardToUser).toHaveBeenCalledWith("ou_custom", expect.any(Object))
  })
})
