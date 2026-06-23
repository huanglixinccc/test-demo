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
            content: "【HRBP】寻聘策略修改建议",
          }),
        }),
      }),
    )
  })

  it("sends recruitment strategy card for 开始/继续/开启", async () => {
    const im = fakeIm()
    await dispatchChatKeywordReply(im, "ou_1", "继续寻访")

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        schema: "2.0",
        body: expect.objectContaining({
          elements: expect.arrayContaining([
            expect.objectContaining({
              text: expect.objectContaining({
                content: expect.stringContaining("【HRBP】寻聘策略已生成"),
              }),
            }),
            expect.objectContaining({
              tag: "column_set",
              flex_mode: "none",
              columns: expect.arrayContaining([
                expect.objectContaining({
                  elements: [
                    expect.objectContaining({
                      tag: "button",
                      text: expect.objectContaining({ content: "仅人岗匹配" }),
                    }),
                  ],
                }),
              ]),
            }),
          ]),
        }),
      }),
    )
    expect(im.sendTextToUser).not.toHaveBeenCalled()
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

  it("sends markdown cards for new private chat keywords", async () => {
    const im = fakeIm()
    const cases = [
      { keyword: "招呼数太少", title: "【HRBP】招呼数分析", snippet: "**结合相关数据看**" },
      { keyword: "查询今天执行进展", title: "【HRBP】今日执行进展", snippet: "**截至今天 10:30，已完成：**" },
      { keyword: "查看今日数据", title: "【HRBP】今日寻聘数据", snippet: "**日期：**2026/06/21" },
      { keyword: "今日待处理候选人", title: "【HRBP】今日待处理候选人", snippet: "**待处理列表：**" },
      { keyword: "查看寻聘模型", title: "【HRBP】寻聘模型", snippet: "**寻访任务配置**" },
    ] as const

    for (const { keyword, title, snippet } of cases) {
      vi.mocked(im.sendTextToUser).mockClear()
      vi.mocked(im.sendCardToUser).mockClear()
      await dispatchChatKeywordReply(im, "ou_1", keyword)

      expect(im.sendCardToUser).toHaveBeenCalledWith(
        "ou_1",
        expect.objectContaining({
          header: expect.objectContaining({
            title: expect.objectContaining({ content: title }),
          }),
          elements: expect.arrayContaining([
            expect.objectContaining({
              text: expect.objectContaining({
                tag: "lark_md",
                content: expect.stringContaining(snippet),
              }),
            }),
          ]),
        }),
      )
      expect(im.sendTextToUser).not.toHaveBeenCalled()
    }
  })

  it("sends updated strategy suggestion card for 寻聘策略修改建议", async () => {
    const im = fakeIm()
    await dispatchChatKeywordReply(im, "ou_1", "寻聘策略修改建议")

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      "ou_1",
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({
            content: "【HRBP】寻聘策略修改建议",
          }),
        }),
        elements: expect.arrayContaining([
          expect.objectContaining({
            text: expect.objectContaining({
              content: expect.stringContaining("区分度不够"),
            }),
          }),
        ]),
      }),
    )
  })
})
