import { describe, it, expect } from "vitest"
import { parseOpenAiSseChunk, readOpenAiSseStream } from "../../src/ai/sse.js"

describe("OpenAI SSE parser", () => {
  it("parses delta content from data line", () => {
    const line = 'data: {"choices":[{"delta":{"content":"你好"}}]}'
    expect(parseOpenAiSseChunk(line)).toBe("你好")
  })

  it("returns null for DONE marker", () => {
    expect(parseOpenAiSseChunk("data: [DONE]")).toBeNull()
  })

  it("reads chunks from stream", async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":"A"}}]}\n\n'),
        )
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":"B"}}]}\n\n'),
        )
        controller.close()
      },
    })

    const chunks: string[] = []
    for await (const piece of readOpenAiSseStream(stream)) {
      chunks.push(piece)
    }
    expect(chunks.join("")).toBe("AB")
  })
})
