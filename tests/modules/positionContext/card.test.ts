import { describe, it, expect } from "vitest"
import { buildPositionSelectCard, buildPositionSelectCardCallbackResponse } from "../../../src/modules/positionContext/card.js"
import { MOCK_POSITIONS } from "../../../src/modules/positionContext/mockPositions.js"
import { SELECT_POSITION_ACTION } from "../../../src/modules/positionContext/constants.js"

describe("position select card", () => {
  it("builds clickable row per position with one-line summary", () => {
    const card = buildPositionSelectCard(MOCK_POSITIONS, "pos_fe") as {
      header: { title: { content: string } }
      elements: Array<{ tag: string; actions?: Array<{ type: string; value: unknown; text: { content: string } }> }>
    }

    expect(card.header.title.content).toBe("选择工作区职位")
    expect(card.elements).toHaveLength(MOCK_POSITIONS.length)

    const serialized = JSON.stringify(card)
    expect(serialized).toContain("上海·张江 · **前端工程师** · 启用 · 已绑号")
    expect(serialized).toContain("北京·望京 · **后端工程师** · 启用 · 未绑号")
    expect(serialized).not.toContain('"content":"选择"')
    expect(serialized).not.toContain("当前职位")

    const currentRow = card.elements[0].actions?.[0]
    const otherRow = card.elements[1].actions?.[0]

    expect(currentRow?.type).toBe("primary")
    expect(otherRow?.type).toBe("default")
    expect(currentRow?.value).toEqual({
      action: SELECT_POSITION_ACTION,
      positionId: "pos_fe",
    })
    expect(otherRow?.value).toEqual({
      action: SELECT_POSITION_ACTION,
      positionId: "pos_be",
    })
  })

  it("uses default style when no position is selected", () => {
    const card = buildPositionSelectCard(MOCK_POSITIONS, null) as {
      elements: Array<{ actions?: Array<{ type: string }> }>
    }

    for (const row of card.elements) {
      expect(row.actions?.[0]?.type).toBe("default")
    }
  })

  it("buildPositionSelectCardCallbackResponse returns raw card update", () => {
    const response = buildPositionSelectCardCallbackResponse(MOCK_POSITIONS, "pos_be", {
      type: "success",
      content: "已切换到：后端工程师",
    })

    expect(response.toast.content).toBe("已切换到：后端工程师")
    expect(response.card.type).toBe("raw")
    expect(JSON.stringify(response.card.data)).toContain("**▸**")
    expect(JSON.stringify(response.card.data)).toContain("**后端工程师**")
  })
})
