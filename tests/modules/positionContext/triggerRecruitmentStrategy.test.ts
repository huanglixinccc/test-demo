import { describe, it, expect, vi } from "vitest"
import {
  triggerRecruitmentStrategy,
  TriggerRecruitmentStrategyError,
} from "../../../src/modules/positionContext/triggerRecruitmentStrategy.js"
import { START_RECRUITMENT_ACTION } from "../../../src/modules/positionContext/constants.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

function fakeIm(): FeishuIM {
  return {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    downloadMessageFile: vi.fn(),
  } as unknown as FeishuIM
}

describe("triggerRecruitmentStrategy", () => {
  it("sends recruitment strategy card to each openId", async () => {
    const im = fakeIm()

    const result = await triggerRecruitmentStrategy(im, {
      positionName: "前端工程师",
      openIds: ["ou_1", "ou_2"],
    })

    expect(result).toEqual({
      positionName: "前端工程师",
      sent: ["ou_1", "ou_2"],
      failed: [],
    })
    expect(im.sendCardToUser).toHaveBeenCalledTimes(2)
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
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

    const card = vi.mocked(im.sendCardToUser).mock.calls[0][1] as {
      body: {
        elements: Array<{
          tag?: string
          columns?: Array<{
            elements?: Array<{ tag?: string; behaviors?: Array<{ type?: string; value?: unknown }> }>
          }>
        }>
      }
    }
    const button = card.body.elements
      .flatMap((el) => (el.tag === "column_set" ? el.columns ?? [] : []))
      .flatMap((col) => col.elements ?? [])
      .find((el) => el.tag === "button")
    expect(button?.behaviors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "open_url" }),
        expect.objectContaining({
          type: "callback",
          value: expect.objectContaining({
            action: START_RECRUITMENT_ACTION,
            positionName: "前端工程师",
          }),
        }),
      ]),
    )
  })

  it("rejects empty positionName", async () => {
    const im = fakeIm()
    await expect(
      triggerRecruitmentStrategy(im, { positionName: "  ", openIds: ["ou_1"] }),
    ).rejects.toBeInstanceOf(TriggerRecruitmentStrategyError)
  })

  it("rejects empty openIds", async () => {
    const im = fakeIm()
    await expect(
      triggerRecruitmentStrategy(im, { positionName: "前端工程师", openIds: [] }),
    ).rejects.toBeInstanceOf(TriggerRecruitmentStrategyError)
  })
})
