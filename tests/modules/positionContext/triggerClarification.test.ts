import { describe, it, expect, vi } from "vitest"
import {
  normalizeOpenIds,
  triggerClarification,
  TriggerClarificationError,
} from "../../../src/modules/positionContext/triggerClarification.js"
import { START_CLARIFICATION_ACTION } from "../../../src/modules/positionContext/constants.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

function fakeIm(): FeishuIM {
  return {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    downloadMessageFile: vi.fn(),
  } as unknown as FeishuIM
}

describe("triggerClarification", () => {
  it("sends clarification card with primary button to each openId", async () => {
    const im = fakeIm()

    const result = await triggerClarification(im, {
      positionName: "HRBP",
      openIds: ["ou_1", "ou_2"],
    })

    expect(result).toEqual({
      positionName: "HRBP",
      sent: ["ou_1", "ou_2"],
      failed: [],
    })
    expect(im.sendCardToUser).toHaveBeenCalledTimes(2)
    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        schema: "2.0",
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "您有一个新职位【HRBP】待澄清" }),
        }),
      }),
    )

    const card = vi.mocked(im.sendCardToUser).mock.calls[0][1] as {
      body: {
        elements: Array<{ tag?: string; type?: string; behaviors?: unknown[] }>
      }
    }
    const button = card.body.elements.find(
      (el) => el.tag === "button" && el.type === "primary_filled",
    )
    expect(button?.behaviors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "open_url" }),
        expect.objectContaining({
          type: "callback",
          value: expect.objectContaining({
            action: START_CLARIFICATION_ACTION,
            positionName: "HRBP",
          }),
        }),
      ]),
    )
  })

  it("rejects empty positionName", async () => {
    const im = fakeIm()
    await expect(
      triggerClarification(im, { positionName: "  ", openIds: ["ou_1"] }),
    ).rejects.toBeInstanceOf(TriggerClarificationError)
  })

  it("rejects empty openIds", async () => {
    const im = fakeIm()
    await expect(
      triggerClarification(im, { positionName: "HRBP", openIds: [] }),
    ).rejects.toBeInstanceOf(TriggerClarificationError)
  })

  it("collects failures without aborting other recipients", async () => {
    const im = fakeIm()
    vi.mocked(im.sendCardToUser)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("send failed"))

    const result = await triggerClarification(im, {
      positionName: "前端工程师",
      openIds: ["ou_ok", "ou_bad"],
    })

    expect(result.sent).toEqual(["ou_ok"])
    expect(result.failed).toEqual([{ openId: "ou_bad", error: "send failed" }])
  })
})

describe("normalizeOpenIds", () => {
  it("deduplicates array openIds", () => {
    expect(normalizeOpenIds([" ou_1 ", "ou_1", "ou_2"])).toEqual(["ou_1", "ou_2"])
  })

  it("accepts single string openId", () => {
    expect(normalizeOpenIds("ou_1")).toEqual(["ou_1"])
  })

  it("falls back to default openIds", () => {
    expect(normalizeOpenIds(undefined, ["ou_default"])).toEqual(["ou_default"])
  })
})
