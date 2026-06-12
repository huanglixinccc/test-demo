import { describe, it, expect, vi } from "vitest"
import type { BitableTables } from "../../src/feishu/bitable.js"
import {
  parseToolIntentJson,
  findInterviewForMeeting,
  formatCreateMeetingReply,
} from "../../src/api/dashboard/chatTools.js"

describe("chatTools", () => {
  it("parses create_meeting intent", () => {
    const intent = parseToolIntentJson(
      '{"tool":"create_meeting","candidateName":"张三","interviewerName":"李四","topic":"前端二面"}',
    )
    expect(intent.tool).toBe("create_meeting")
    if (intent.tool === "create_meeting") {
      expect(intent.args.candidateName).toBe("张三")
      expect(intent.args.interviewerName).toBe("李四")
      expect(intent.args.topic).toBe("前端二面")
    }
  })

  it("returns none for invalid json", () => {
    expect(parseToolIntentJson("只是查一下漏斗").tool).toBe("none")
  })

  it("finds interview by candidate name", async () => {
    const bitable = {
      listAllInterviews: vi.fn().mockResolvedValue([
        {
          record_id: "rec_iv1",
          fields: {
            candidateName: "张三",
            interviewerName: "李四",
            interviewTime: Date.now(),
            interviewStatus: "待面试",
          },
        },
      ]),
      listAllCandidates: vi.fn(),
      findInterviewsByCandidateId: vi.fn(),
    } as unknown as BitableTables

    const row = await findInterviewForMeeting(bitable, {
      candidateName: "张三",
      interviewerName: "李四",
    })
    expect(row.record_id).toBe("rec_iv1")
  })

  it("formats meeting reply", () => {
    const text = formatCreateMeetingReply({
      candidateName: "张三",
      fromCache: false,
      clipboardText: "邀请文案",
      meeting: { url: "https://meet.example.com", meetingNo: "123", appLink: "https://meet.example.com" },
    })
    expect(text).toContain("张三")
    expect(text).toContain("https://meet.example.com")
    expect(text).toContain("邀请文案")
  })
})
