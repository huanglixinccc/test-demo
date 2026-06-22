import { describe, it, expect, vi } from "vitest"
import { dispatchChatKeywordReply } from "../../../src/modules/positionContext/chatKeywordReply.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

function fakeIm(): FeishuIM {
  return {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    downloadMessageFile: vi.fn(),
  } as unknown as FeishuIM
}

describe("dispatchChatKeywordReply", () => {
  it("sends recruitment data card for 寻聘数据", async () => {
    const im = fakeIm()
    await dispatchChatKeywordReply(im, "ou_1", "寻聘数据")

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "【HRBP】今日寻聘数据" }),
        }),
      }),
    )
    expect(im.sendTextToUser).not.toHaveBeenCalled()
  })

  it("sends clarification card for 职位澄清", async () => {
    const im = fakeIm()
    await dispatchChatKeywordReply(im, "ou_1", "职位澄清")

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        schema: "2.0",
        header: expect.objectContaining({
          title: expect.objectContaining({
            content: "您有一个新职位【HRBP】待澄清",
          }),
        }),
      }),
    )
    expect(im.sendTextToUser).not.toHaveBeenCalled()
  })

  it("sends strategy template suggestion card for 修改建议", async () => {
    const im = fakeIm()
    await dispatchChatKeywordReply(im, "ou_1", "策略模板建议")

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({
            content: "【安卓高级开发工程师】配置修改建议已生成",
          }),
        }),
      }),
    )
  })

  it("sends fixed text for 查看职位画像", async () => {
    const im = fakeIm()
    await dispatchChatKeywordReply(im, "ou_1", "查看职位画像")

    expect(im.sendTextToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.stringContaining("【职位画像】"),
    )
    expect(im.sendCardToUser).not.toHaveBeenCalled()
  })

  it("sends rejection reason card for 淘汰理由分析", async () => {
    const im = fakeIm()
    await dispatchChatKeywordReply(im, "ou_1", "淘汰理由分析")

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "【HRBP】淘汰理由分析" }),
        }),
      }),
    )
  })
})
