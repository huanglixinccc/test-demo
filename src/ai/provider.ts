export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface AIChatOptions {
  temperature?: number
  maxTokens?: number
}

export interface AIProvider {
  chat(messages: ChatMessage[], opts?: AIChatOptions): Promise<string>
  chatStream?(messages: ChatMessage[], opts?: AIChatOptions): AsyncGenerator<string>
}
