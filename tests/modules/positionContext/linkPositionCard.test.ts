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
  it("builds platform rows without exposing link state on card", () => {
    const card = buildLinkPositionCard()
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe("关联职位")
    expect(serialized).toContain("boss 直聘")
    expect(serialized).toContain("猎聘")
    expect(serialized).toContain("请选择职位")
    expect(serialized).not.toContain("allPlatformsLinked")
    expect(serialized).not.toContain("已关联")
    expect(serialized).not.toContain("未关联")
  })

  it("shows platform checkbox table for unlinked position selection", () => {
    const collapsed = JSON.stringify(buildLinkPositionCard())
    const expanded = JSON.stringify(
      buildLinkPositionCard({
        expandedPlatformId: "platform_liepin",
        pendingPositionId: "pos_fe",
      }),
    )

    expect(collapsed).not.toContain("请选择需要关联的平台")
    expect(expanded).toContain("请选择需要关联的平台")
    expect(expanded).toContain("boss 直聘")
    expect(expanded).toContain("moka")
    expect(expanded).toContain('"platformId":"platform_liepin"')
  })

  it("does not show checkbox table for fully linked first position", () => {
    const expanded = JSON.stringify(
      buildLinkPositionCard({
        expandedPlatformId: "platform_boss",
        pendingPositionId: "pos_hrbp",
      }),
    )

    expect(expanded).not.toContain("请选择需要关联的平台")
  })

  it("builds clarification card with start button", () => {
    const card = buildClarificationCard("HRBP")
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe("您有一个新职位【HRBP】待澄清")
    expect(serialized).toContain("检测到新职位【HRBP】已进入系统")
    expect(serialized).toContain("开始澄清")
    expect(serialized).toContain(START_CLARIFICATION_ACTION)
  })

  it("embeds select and confirm action values", () => {
    const card = buildLinkPositionCard({
      expandedPlatformId: "platform_moka",
      pendingPositionId: "pos_be",
    })
    const serialized = JSON.stringify(card)

    expect(serialized).toContain(LINK_POSITION_SELECT_ACTION)
    expect(serialized).toContain(LINK_POSITION_CONFIRM_ACTION)
    expect(serialized).toContain(MOCK_RECRUITMENT_PLATFORMS[0].id)
  })
})
