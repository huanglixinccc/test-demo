export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface AIProvider {
  chat(messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string>
}
