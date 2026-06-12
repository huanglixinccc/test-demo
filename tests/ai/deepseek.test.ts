import { describe, it, expect, vi } from "vitest"
import axios, { type AxiosInstance } from "axios"
import { createDeepSeekProvider } from "../../src/ai/deepseek.js"
import { AIProviderError } from "../../src/ai/errors.js"

describe("DeepSeek provider", () => {
  it("posts to /chat/completions and returns content", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { choices: [{ message: { content: "hello" } }] },
    })
    const fakeClient = { post } as unknown as AxiosInstance

    const provider = createDeepSeekProvider({
      apiKey: "k",
      baseUrl: "https://x",
      model: "deepseek-chat",
      client: fakeClient,
    })

    const out = await provider.chat(
      [
        { role: "system", content: "s" },
        { role: "user", content: "u" },
      ],
      { temperature: 0, maxTokens: 100 },
    )

    expect(out).toBe("hello")
    expect(post).toHaveBeenCalledWith(
      "/chat/completions",
      expect.objectContaining({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "s" },
          { role: "user", content: "u" },
        ],
        temperature: 0,
        max_tokens: 100,
        stream: false,
      }),
    )
  })

  it("throws if response has no content", async () => {
    const post = vi.fn().mockResolvedValue({ data: { choices: [] } })
    const fakeClient = { post } as unknown as AxiosInstance
    const provider = createDeepSeekProvider({
      apiKey: "k",
      baseUrl: "https://x",
      model: "m",
      client: fakeClient,
    })
    await expect(provider.chat([{ role: "user", content: "u" }])).rejects.toThrow(/no content/)
  })

  it("maps 402 insufficient balance to AIProviderError", async () => {
    const err = new axios.AxiosError(
      "Payment Required",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 402,
        statusText: "Payment Required",
        headers: {},
        config: { headers: new axios.AxiosHeaders() },
        data: { error: { message: "Insufficient Balance" } },
      },
    )
    const post = vi.fn().mockRejectedValue(err)
    const provider = createDeepSeekProvider({
      apiKey: "k",
      baseUrl: "https://x",
      model: "m",
      client: { post } as unknown as AxiosInstance,
    })
    await expect(provider.chat([{ role: "user", content: "u" }])).rejects.toThrow(AIProviderError)
    await expect(provider.chat([{ role: "user", content: "u" }])).rejects.toThrow(/余额不足/)
  })
})
