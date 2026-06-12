import { describe, it, expect, vi } from "vitest"
import {
  createInterviewMeeting,
  updateInterviewFields,
  MeetingValidationError,
} from "../../src/api/dashboard/handlers.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuVC } from "../../src/feishu/vc.js"
import { normalizeOpenId } from "../../src/feishu/bitableFields.js"

function mockBitable(overrides: Partial<BitableTables> = {}): BitableTables {
  return {
    getInterview: vi.fn(),
    updateInterview: vi.fn().mockResolvedValue(undefined),
    findCandidateByCandidateId: vi.fn(),
    ...overrides,
  } as unknown as BitableTables
}

describe("createInterviewMeeting", () => {
  it("normalizeOpenId accepts standard open_id", () => {
    expect(normalizeOpenId("ou_3ec3f6a28a0d08c45d895276e8e5e19b")).toBe(
      "ou_3ec3f6a28a0d08c45d895276e8e5e19b",
    )
  })

  it("rejects when interview time missing", async () => {
    const bitable = mockBitable({
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec_iv",
        fields: {
          candidateName: "张三",
          interviewerName: "李四",
          interviewerOpenId: "ou_3ec3f6a28a0d08c45d895276e8e5e19b",
        },
      }),
    })
    const vc = { createReserve: vi.fn() } as unknown as FeishuVC

    await expect(
      createInterviewMeeting(bitable, vc, "rec_iv", "ou_hr"),
    ).rejects.toThrow(MeetingValidationError)
  })

  it("creates meeting and returns clipboard text", async () => {
    const interviewTime = new Date("2026-06-15T14:00:00+08:00").getTime()
    const bitable = mockBitable({
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec_iv",
        fields: {
          candidateId: "c1",
          candidateName: "张三",
          interviewerName: "李四",
          interviewerOpenId: "ou_3ec3f6a28a0d08c45d895276e8e5e19b",
          interviewTime,
        },
      }),
      findCandidateByCandidateId: vi.fn().mockResolvedValue({
        record_id: "rec_c",
        fields: { position: "前端工程师" },
      }),
    })
    const vc = {
      createReserve: vi.fn().mockResolvedValue({
        id: "1",
        meetingNo: "112000358",
        url: "https://vc.feishu.cn/j/123",
        appLink: "https://applink.feishu.cn",
        endTime: "1608883322",
      }),
    } as unknown as FeishuVC

    const result = await createInterviewMeeting(bitable, vc, "rec_iv", "ou_hr")
    expect(result.meeting.meetingNo).toBe("112000358")
    expect(result.clipboardText).toContain("张三")
    expect(result.fromCache).toBe(false)
    expect(vc.createReserve).toHaveBeenCalled()
    expect(bitable.updateInterview).toHaveBeenCalledWith("rec_iv", {
      meetingUrl: "https://vc.feishu.cn/j/123",
    })
  })

  it("returns cached meeting when meetingUrl exists", async () => {
    const interviewTime = new Date("2026-06-15T14:00:00+08:00").getTime()
    const bitable = mockBitable({
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec_iv",
        fields: {
          candidateId: "c1",
          candidateName: "张三",
          interviewerName: "李四",
          interviewerOpenId: "ou_3ec3f6a28a0d08c45d895276e8e5e19b",
          interviewTime,
          meetingUrl: "https://vc.feishu.cn/j/existing",
        },
      }),
      findCandidateByCandidateId: vi.fn().mockResolvedValue({
        record_id: "rec_c",
        fields: { position: "前端工程师" },
      }),
    })
    const vc = { createReserve: vi.fn() } as unknown as FeishuVC

    const result = await createInterviewMeeting(bitable, vc, "rec_iv", "ou_hr")
    expect(result.fromCache).toBe(true)
    expect(result.meeting.url).toBe("https://vc.feishu.cn/j/existing")
    expect(vc.createReserve).not.toHaveBeenCalled()
  })

  it("rejects meeting for completed interview", async () => {
    const interviewTime = new Date("2026-06-15T14:00:00+08:00").getTime()
    const bitable = mockBitable({
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec_iv",
        fields: {
          candidateName: "张三",
          interviewerName: "李四",
          interviewerOpenId: "ou_3ec3f6a28a0d08c45d895276e8e5e19b",
          interviewTime,
          interviewStatus: "已完成",
        },
      }),
    })
    const vc = { createReserve: vi.fn() } as unknown as FeishuVC

    await expect(
      createInterviewMeeting(bitable, vc, "rec_iv", "ou_hr"),
    ).rejects.toThrow("已完成的面试不可创建会议链接")
  })

  it("updateInterviewFields saves interview time", async () => {
    const interviewTime = new Date("2026-06-15T14:00:00+08:00").getTime()
    const updatedFields = {
      candidateName: "张三",
      interviewerName: "李四",
      interviewerOpenId: "ou_3ec3f6a28a0d08c45d895276e8e5e19b",
      interviewTime,
      interviewStatus: "待安排",
    }
    const bitable = mockBitable({
      getInterview: vi
        .fn()
        .mockResolvedValueOnce({
          record_id: "rec_iv",
          fields: { interviewStatus: "待安排", candidateName: "张三" },
        })
        .mockResolvedValueOnce({
          record_id: "rec_iv",
          fields: updatedFields,
        }),
      updateInterview: vi.fn().mockResolvedValue(undefined),
    })

    const result = await updateInterviewFields(bitable, "rec_iv", { interviewTime })
    expect(bitable.updateInterview).toHaveBeenCalledWith("rec_iv", { interviewTime })
    expect(result.interviewTime).toBe(interviewTime)
  })
})
