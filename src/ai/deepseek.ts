import axios, { type AxiosInstance } from "axios"
import type { AIProvider, ChatMessage } from "./provider.js"

export interface DeepSeekConfig {
  apiKey: string
  baseUrl: string
  model: string
  client?: AxiosInstance
}

export function createDeepSeekProvider(cfg: DeepSeekConfig): AIProvider {
  const http =
    cfg.client ??
    axios.create({
      baseURL: cfg.baseUrl,
      timeout: 60_000,
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    })

  return {
    async chat(messages: ChatMessage[], opts) {
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
    },
  }
}
