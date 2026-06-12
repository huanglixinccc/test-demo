import { describe, it, expect } from "vitest"
import {
  buildBossInterviewDraftMessage,
  isBossResumeSource,
} from "../../src/outreach/boss/template.js"

describe("boss template", () => {
  it("builds interview draft message", () => {
    const text = buildBossInterviewDraftMessage({
      candidateName: "张三",
      position: "前端工程师",
      interviewTime: new Date("2026-06-15T14:00:00+08:00").getTime(),
      interviewerName: "李四",
      meetingUrl: "https://meet.example.com/abc",
    })
    expect(text).toContain("张三")
    expect(text).toContain("前端工程师")
    expect(text).toContain("李四")
    expect(text).toContain("https://meet.example.com/abc")
    expect(text).toContain("请确认是否能够参加")
  })

  it("detects boss resume source", () => {
    expect(isBossResumeSource("Boss直聘")).toBe(true)
    expect(isBossResumeSource("boss")).toBe(true)
    expect(isBossResumeSource("猎聘")).toBe(false)
  })
})
