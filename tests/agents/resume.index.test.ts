import { describe, it, expect, vi, beforeEach } from "vitest"
import { registerResumeAgent } from "../../src/agents/resume/index.js"
import { bus } from "../../src/events/bus.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuIM } from "../../src/feishu/im.js"

function deps(
  overrides: Partial<{
    aiContent: string
    createOk: boolean
  }> = {},
) {
  const ai = {
    chat: vi.fn().mockResolvedValue(
      overrides.aiContent ??
        `{"name":"张三","phone":"138","email":"a@b.com","position":"前端","yearsOfExperience":3,"skills":["React"]}`,
    ),
  }
  const createCandidate =
    overrides.createOk === false
      ? vi.fn().mockRejectedValue(new Error("boom"))
      : vi.fn().mockResolvedValue({ record_id: "rec_1", fields: {} })
  const bitable = { createCandidate } as unknown as BitableTables
  const im = {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as FeishuIM
  return { ai, bitable, im, createCandidate }
}

describe("ResumeAgent", () => {
  beforeEach(() => bus._resetForTesting())

  it("writes candidate to Bitable and replies with card on happy path", async () => {
    const { ai, bitable, im, createCandidate } = deps()
    registerResumeAgent({ ai, bitable, im })

    bus.emit("ResumeReceived", {
      text: "...",
      senderOpenId: "ou_1",
      sourceMessageId: "om_1",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(createCandidate).toHaveBeenCalledTimes(1)
    const call = createCandidate.mock.calls[0]![0]
    expect(call.name).toBe("张三")
    expect(call.skills).toEqual(["React"])
    expect(call.status).toBe("待筛选")
    expect(im.sendCardToUser).toHaveBeenCalled()
  })

  it("notifies user when LLM returns no key fields", async () => {
    const { ai, bitable, im, createCandidate } = deps({
      aiContent: `{"name":null,"phone":null,"email":null,"position":null,"yearsOfExperience":null,"skills":[]}`,
    })
    registerResumeAgent({ ai, bitable, im })

    bus.emit("ResumeReceived", {
      text: "...",
      senderOpenId: "ou_1",
      sourceMessageId: "om_1",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(createCandidate).not.toHaveBeenCalled()
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_1", expect.stringContaining("未识别到"))
  })

  it("notifies user on Bitable failure", async () => {
    const { ai, bitable, im } = deps({ createOk: false })
    registerResumeAgent({ ai, bitable, im })

    bus.emit("ResumeReceived", {
      text: "...",
      senderOpenId: "ou_1",
      sourceMessageId: "om_1",
    })
    await new Promise((r) => setTimeout(r, 20))

    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_1", expect.stringContaining("写入失败"))
  })
})
