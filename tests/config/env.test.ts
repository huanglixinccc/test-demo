import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

describe("env loader", () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    for (const key of Object.keys(process.env)) {
      if (
        key.startsWith("FEISHU_") ||
        key.startsWith("DEEPSEEK_") ||
        key === "HR_OPEN_IDS"
      ) {
        delete process.env[key]
      }
    }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it("throws when required vars are missing", async () => {
    await expect(import("../../src/config/env.js")).rejects.toThrow(/Missing env var/)
  })

  it("parses HR_OPEN_IDS into array", async () => {
    process.env.FEISHU_APP_ID = "a"
    process.env.FEISHU_APP_SECRET = "b"
    process.env.FEISHU_VERIFICATION_TOKEN = "c"
    process.env.FEISHU_ENCRYPT_KEY = "d"
    process.env.FEISHU_BITABLE_APP_TOKEN = "e"
    process.env.FEISHU_TABLE_CANDIDATE = "f"
    process.env.FEISHU_TABLE_REFERRAL = "g"
    process.env.FEISHU_TABLE_INTERVIEW = "h"
    process.env.FEISHU_TABLE_JD = "i"
    process.env.HR_OPEN_IDS = "ou_1, ou_2 ,ou_3"
    process.env.DEEPSEEK_API_KEY = "k"
    const mod = await import("../../src/config/env.js")
    expect(mod.env.hrOpenIds).toEqual(["ou_1", "ou_2", "ou_3"])
  })
})
