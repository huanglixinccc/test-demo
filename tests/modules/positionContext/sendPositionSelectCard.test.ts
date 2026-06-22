import { describe, it, expect, vi, beforeEach } from "vitest"
import { sendPositionSelectCard } from "../../../src/modules/positionContext/sendPositionSelectCard.js"
import { positionContextStore } from "../../../src/modules/positionContext/store.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

function fakeIm(): FeishuIM {
  return {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    downloadMessageFile: vi.fn(),
  } as unknown as FeishuIM
}

describe("sendPositionSelectCard", () => {
  beforeEach(() => {
    positionContextStore.clearForTesting()
  })

  it("sends position select card to user", async () => {
    const im = fakeIm()

    await sendPositionSelectCard(im, "ou_hr")

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_hr",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "关联职位" }),
        }),
      }),
    )
  })
})
