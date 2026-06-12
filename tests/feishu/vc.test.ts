import { describe, it, expect, vi } from "vitest"
import { FeishuVC, buildMeetingClipboardText } from "../../src/feishu/vc.js"
import type { FeishuClient } from "../../src/feishu/client.js"

describe("FeishuVC", () => {
  it("createReserve maps API response", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({
        reserve: {
          id: "6911188411934973028",
          meeting_no: "112000358",
          password: "971024",
          url: "https://vc.feishu.cn/j/337736498",
          app_link: "https://applink.feishu.cn/client/videochat/open",
          live_link: "https://meetings.feishu.cn/s/abc",
          end_time: "1608883322",
        },
      }),
    } as unknown as FeishuClient

    const vc = new FeishuVC(client)
    const result = await vc.createReserve({
      topic: "面试｜张三",
      ownerId: "ou_hr",
      endTimeSec: 1608888867,
      hostIds: ["ou_iv"],
    })

    expect(result.meetingNo).toBe("112000358")
    expect(result.url).toContain("vc.feishu.cn")
    expect(client.request).toHaveBeenCalledWith(
      "POST",
      "/open-apis/vc/v1/reserves/apply?user_id_type=open_id",
      expect.objectContaining({
        data: expect.objectContaining({
          owner_id: "ou_hr",
          meeting_settings: expect.objectContaining({ topic: "面试｜张三" }),
        }),
      }),
    )
  })
})

describe("buildMeetingClipboardText", () => {
  it("includes candidate and meeting info", () => {
    const text = buildMeetingClipboardText({
      candidateName: "张三",
      position: "前端工程师",
      interviewerName: "李四",
      interviewTimeMs: new Date("2026-06-15T14:00:00+08:00").getTime(),
      meeting: {
        id: "1",
        meetingNo: "112000358",
        url: "https://vc.feishu.cn/j/123",
        appLink: "https://applink.feishu.cn",
        password: "1234",
        endTime: "1608883322",
      },
    })
    expect(text).toContain("张三")
    expect(text).toContain("前端工程师")
    expect(text).toContain("李四")
    expect(text).toContain("112000358")
    expect(text).toContain("https://vc.feishu.cn/j/123")
    expect(text).toContain("1234")
  })
})
