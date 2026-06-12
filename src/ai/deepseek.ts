import axios, { type AxiosInstance, isAxiosError } from "axios"
import type { AIProvider, ChatMessage } from "./provider.js"
import { AIProviderError } from "./errors.js"
import { readOpenAiSseStream } from "./sse.js"

export interface DeepSeekConfig {
  apiKey: string
  baseUrl: string
  model: string
  client?: AxiosInstance
}

function apiBase(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "")
}

function mapApiError(status: number | undefined, apiMsg: string | undefined): never {
  if (status === 402 || apiMsg === "Insufficient Balance") {
    throw new AIProviderError(
      "DeepSeek 账户余额不足，请前往 platform.deepseek.com 充值后重试",
      402,
    )
  }
  if (status === 401) {
    throw new AIProviderError("DeepSeek API Key 无效，请检查 .env 中的 DEEPSEEK_API_KEY", 401)
  }
  if (status === 429) {
    throw new AIProviderError("AI 请求过于频繁，请稍后再试", 429)
  }
  throw new AIProviderError(apiMsg ?? `AI 服务异常（HTTP ${status ?? "unknown"}）`, status)
}

export function createDeepSeekProvider(cfg: DeepSeekConfig): AIProvider {
  const http =
    cfg.client ??
    axios.create({
      baseURL: cfg.baseUrl,
      timeout: 60_000,
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    })
  const completionsUrl = `${apiBase(cfg.baseUrl)}/chat/completions`

  return {
    async chat(messages: ChatMessage[], opts) {
      try {
        const res = await http.post("/chat/completions", {
          model: cfg.model,
          messages,
          temperature: opts?.temperature ?? 0.1,
          max_tokens: opts?.maxTokens ?? 1024,
          stream: false,
        })
        const content = res.data?.choices?.[0]?.message?.content
        if (typeof content !== "string") throw new Error("DeepSeek returned no content")
        return content
      } catch (err) {
        if (isAxiosError(err)) {
          const status = err.response?.status
          const apiMsg =
            typeof err.response?.data?.error?.message === "string"
              ? err.response.data.error.message
              : undefined
          mapApiError(status, apiMsg)
        }
        throw err
      }
    },

    async *chatStream(messages: ChatMessage[], opts) {
      const res = await fetch(completionsUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          temperature: opts?.temperature ?? 0.1,
          max_tokens: opts?.maxTokens ?? 1024,
          stream: true,
        }),
      })

      if (!res.ok) {
        let apiMsg: string | undefined
        try {
          const json = (await res.json()) as { error?: { message?: string } }
          apiMsg = typeof json.error?.message === "string" ? json.error.message : undefined
        } catch {
          // ignore parse error
        }
        mapApiError(res.status, apiMsg)
      }

      if (!res.body) throw new AIProviderError("AI 流式响应为空")
      yield* readOpenAiSseStream(res.body)
    },
  }
}
