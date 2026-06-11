import { describe, it, expect } from "vitest"
import { LruDedupe } from "../../src/utils/dedupe.js"

describe("LruDedupe", () => {
  it("returns false on first sighting, true on repeat", () => {
    const d = new LruDedupe(3)
    expect(d.seen("a")).toBe(false)
    expect(d.seen("a")).toBe(true)
  })

  it("evicts oldest beyond capacity", () => {
    const d = new LruDedupe(2)
    d.seen("a")
    d.seen("b")
    d.seen("c")
    expect(d.seen("a")).toBe(false)
  })
})
