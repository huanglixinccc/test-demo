import { describe, it, expect, vi } from "vitest"
import { runOnce, _resetRunOnceForTesting } from "../../src/utils/runOnce.js"

describe("runOnce", () => {
  it("runs fn only once for concurrent calls with same key", async () => {
    _resetRunOnceForTesting()
    const fn = vi.fn().mockImplementation(
      () => new Promise((r) => setTimeout(() => r(42), 20)),
    )

    const [a, b] = await Promise.all([runOnce("k1", fn), runOnce("k1", fn)])
    expect(a).toBe(42)
    expect(b).toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
