import { describe, it, expect } from "vitest"
import {
  buildClarificationCard,
  buildLinkPositionCard,
} from "../../../src/modules/positionContext/linkPositionCard.js"
import {
  LINK_POSITION_CONFIRM_ACTION,
  LINK_POSITION_SELECT_ACTION,
  START_CLARIFICATION_ACTION,
} from "../../../src/modules/positionContext/constants.js"
import { MOCK_RECRUITMENT_PLATFORMS } from "../../../src/modules/positionContext/mockPlatforms.js"

describe("link position card", () => {
  it("builds static demo link card for a workspace position", () => {
    const card = buildLinkPositionCard({ positionId: "pos_be", positionName: "后端工程师" })
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe("关联职位")
    expect(serialized).toContain("请为【后端工程师】关联各平台职位")
    expect(serialized).toContain("boss 直聘")
    expect(serialized).toContain("请选择职位")
    expect(serialized).toContain("请选择需要关联的平台")
    expect(serialized).not.toContain("platformLinked")
    expect(serialized).not.toContain("已关联")
  })

  it("embeds workspace position in confirm action", () => {
    const card = buildLinkPositionCard({ positionId: "pos_pm", positionName: "产品经理" })
    const serialized = JSON.stringify(card)

    expect(serialized).toContain(LINK_POSITION_CONFIRM_ACTION)
    expect(serialized).toContain('"positionId":"pos_pm"')
    expect(serialized).toContain('"positionName":"产品经理"')
    expect(serialized).toContain(LINK_POSITION_SELECT_ACTION)
    expect(serialized).toContain(MOCK_RECRUITMENT_PLATFORMS[0].id)
  })

  it("builds clarification card with start button", () => {
    const card = buildClarificationCard("前端工程师")
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe("您有一个新职位【前端工程师】待澄清")
    expect(serialized).toContain("检测到新职位【前端工程师】已进入系统")
    expect(serialized).toContain("开始澄清")
    expect(serialized).toContain(START_CLARIFICATION_ACTION)
  })
})
