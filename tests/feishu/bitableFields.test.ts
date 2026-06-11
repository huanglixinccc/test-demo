import { describe, it, expect } from "vitest"
import {
  extractCandidateStatusFromAction,
  extractReviewResultFromAction,
  isInterviewPendingSchedule,
  normalizeBitableFieldValue,
  normalizeBitableTimestamp,
  normalizeOpenId,
} from "../../src/feishu/bitableFields.js"

describe("bitableFields", () => {
  it("normalizes plain string status", () => {
    expect(normalizeBitableFieldValue("技术面")).toBe("技术面")
  })

  it("normalizes rich-text JSON string", () => {
    expect(normalizeBitableFieldValue('[{"type":"text","text":"王五"}]')).toBe("王五")
  })

  it("extracts status from record_edited after_value", () => {
    const status = extractCandidateStatusFromAction({
      action: "record_edited",
      record_id: "rec1",
      after_value: [{ field_id: "fld_status", field_value: "技术面" }],
    })
    expect(status).toBe("技术面")
  })

  it("ignores non-status values in after_value", () => {
    const status = extractCandidateStatusFromAction({
      action: "record_edited",
      record_id: "rec1",
      after_value: [{ field_id: "fld_name", field_value: "王五" }],
    })
    expect(status).toBeUndefined()
  })

  it("normalizes full open_id", () => {
    expect(normalizeOpenId("ou_b5746a453c4ebea22f6adce5d584fcbf")).toBe(
      "ou_b5746a453c4ebea22f6adce5d584fcbf",
    )
  })

  it("rejects truncated display label as open_id", () => {
    expect(normalizeOpenId("推荐人(ou_b5746…)")).toBeUndefined()
  })

  it("treats 未通知 as pending schedule status", () => {
    expect(isInterviewPendingSchedule(undefined)).toBe(true)
    expect(isInterviewPendingSchedule("待安排")).toBe(true)
    expect(isInterviewPendingSchedule("未通知")).toBe(true)
    expect(isInterviewPendingSchedule("待面试")).toBe(false)
  })

  it("extracts reviewResult from record_edited after_value", () => {
    const result = extractReviewResultFromAction({
      action: "record_edited",
      record_id: "rec1",
      after_value: [{ field_id: "fld_review", field_value: "通过" }],
    })
    expect(result).toBe("通过")
  })

  it("normalizes Bitable timestamps in seconds and milliseconds", () => {
    expect(normalizeBitableTimestamp(1_700_000_000_000)).toBe(1_700_000_000_000)
    expect(normalizeBitableTimestamp(1_700_000_000)).toBe(1_700_000_000_000)
  })
})
