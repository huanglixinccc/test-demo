import { describe, it, expect, vi } from "vitest"
import { parseResume, hasAnyKeyField } from "../../src/agents/resume/parse.js"
import type { AIProvider } from "../../src/ai/provider.js"

function aiReturning(content: string): AIProvider {
  return { chat: vi.fn().mockResolvedValue(content) }
}

describe("parseResume", () => {
  it("parses clean JSON output", async () => {
    const ai = aiReturning(
      `{"name":"张三","phone":"138","email":"a@b.com","position":"前端","yearsOfExperience":3,"skills":["React","TypeScript"]}`,
    )
    const out = await parseResume(ai, "...")
    expect(out.name).toBe("张三")
    expect(out.skills).toEqual(["React", "TypeScript"])
  })

  it("extracts JSON from surrounding text", async () => {
    const ai = aiReturning(
      `Sure, here it is:\n{"name":"李四","phone":null,"email":"x@y.com","position":null,"yearsOfExperience":null,"skills":[]}\n`,
    )
    const out = await parseResume(ai, "...")
    expect(out.name).toBe("李四")
    expect(out.position).toBe(null)
  })

  it("caps skills at 8", async () => {
    const skills = Array.from({ length: 20 }, (_, i) => `s${i}`)
    const ai = aiReturning(
      JSON.stringify({
        name: null,
        phone: null,
        email: null,
        position: null,
        yearsOfExperience: null,
        skills,
      }),
    )
    const out = await parseResume(ai, "...")
    expect(out.skills).toHaveLength(8)
  })

  it("throws on non-JSON content", async () => {
    const ai = aiReturning("no json here")
    await expect(parseResume(ai, "...")).rejects.toThrow(/did not return JSON/)
  })

  it("hasAnyKeyField requires at least one of name/phone/email", () => {
    expect(
      hasAnyKeyField({
        name: null,
        phone: null,
        email: null,
        position: null,
        yearsOfExperience: null,
        skills: [],
      }),
    ).toBe(false)
    expect(
      hasAnyKeyField({
        name: "x",
        phone: null,
        email: null,
        position: null,
        yearsOfExperience: null,
        skills: [],
      }),
    ).toBe(true)
  })
})
