import { describe, it, expect, vi, beforeEach } from "vitest"
import { bus } from "../../src/events/bus.js"

describe("event bus", () => {
  beforeEach(() => bus._resetForTesting())

  it("dispatches typed events to handlers", async () => {
    const handler = vi.fn()
    bus.on("ResumeReceived", handler)
    bus.emit("ResumeReceived", {
      text: "hi",
      senderOpenId: "ou_1",
      sourceMessageId: "om_1",
    })
    await new Promise((r) => setImmediate(r))
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ senderOpenId: "ou_1" }))
  })

  it("does not throw when a handler throws", async () => {
    bus.on("InterviewScheduled", () => {
      throw new Error("boom")
    })
    expect(() =>
      bus.emit("InterviewScheduled", {
        interviewRecordId: "rec",
        candidateId: "c",
        candidateName: "n",
        interviewerName: "i",
        interviewerOpenId: "ou",
        interviewTime: Date.now(),
      }),
    ).not.toThrow()
    await new Promise((r) => setImmediate(r))
  })
})
