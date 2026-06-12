export function parseOpenAiSseChunk(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith("data:")) return null
  const payload = trimmed.slice(5).trim()
  if (!payload || payload === "[DONE]") return null
  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string } }>
    }
    const piece = json.choices?.[0]?.delta?.content
    return typeof piece === "string" ? piece : null
  } catch {
    return null
  }
}

export async function* readOpenAiSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n")
    buffer = parts.pop() ?? ""
    for (const line of parts) {
      const piece = parseOpenAiSseChunk(line)
      if (piece) yield piece
    }
  }

  if (buffer.trim()) {
    const piece = parseOpenAiSseChunk(buffer)
    if (piece) yield piece
  }
}
