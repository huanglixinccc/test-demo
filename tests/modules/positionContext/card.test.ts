import { describe, it, expect } from "vitest"
import { buildPositionSelectCard } from "../../../src/modules/positionContext/card.js"
import { MOCK_POSITIONS } from "../../../src/modules/positionContext/mockPositions.js"
import { SELECT_POSITION_ACTION } from "../../../src/modules/positionContext/constants.js"

describe("position select card", () => {
  it("builds card with current position header and select buttons", () => {
    const card = buildPositionSelectCard(MOCK_POSITIONS, "pos_fe") as {
      header: { title: { content: string } }
      elements: unknown[]
    }

    expect(card.header.title.content).toBe("选择工作区职位")
    expect(JSON.stringify(card)).toContain("当前职位")
    expect(JSON.stringify(card)).toContain("前端工程师")
    expect(JSON.stringify(card)).toContain(SELECT_POSITION_ACTION)
    expect(JSON.stringify(card)).toContain("pos_be")
  })

  it("marks current position button as 当前职位", () => {
    const card = buildPositionSelectCard(MOCK_POSITIONS, "pos_fe")
    expect(JSON.stringify(card)).toContain("当前职位")
  })
})
