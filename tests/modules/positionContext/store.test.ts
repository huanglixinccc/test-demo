import { describe, it, expect, beforeEach } from "vitest"
import { PositionContextStore } from "../../../src/modules/positionContext/store.js"

describe("PositionContextStore", () => {
  let store: PositionContextStore

  beforeEach(() => {
    store = new PositionContextStore(false)
    store.clearForTesting()
  })

  it("stores and retrieves current position", () => {
    const position = store.setCurrentPosition("ou_1", "pos_fe")
    expect(position?.name).toBe("前端工程师")
    expect(store.getCurrentPositionId("ou_1")).toBe("pos_fe")
    expect(store.getCurrentPosition("ou_1")?.address).toBe("上海·张江")
  })

  it("returns null for unknown position id", () => {
    expect(store.setCurrentPosition("ou_1", "unknown")).toBeNull()
  })
})
