import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { makePositionSelectMenuHandler } from "./menuHandler.js"
import { makePositionSelectCardActionHandler } from "./cardActionHandler.js"
import { makeLinkPositionCardActionHandler } from "./linkPositionCardActionHandler.js"

export {
  MENU_EVENT_TYPE,
  LINK_POSITION_CONFIRM_ACTION,
  LINK_POSITION_SELECT_ACTION,
  SELECT_POSITIONS_EVENT_KEY,
  SELECT_POSITION_ACTION,
  CLARIFICATION_H5_URL,
} from "./constants.js"
export type { WorkspacePosition } from "./types.js"
export { MOCK_RECRUITMENT_PLATFORMS, findRecruitmentPlatform } from "./mockPlatforms.js"
export {
  MOCK_POSITIONS,
  findMockPosition,
  isWorkspacePositionPlatformLinked,
} from "./mockPositions.js"
export { positionContextStore, PositionContextStore } from "./store.js"
export { buildPositionSelectCard } from "./card.js"
export { buildClarificationCard, buildLinkPositionCard } from "./linkPositionCard.js"
export { sendPositionSelectCard } from "./sendPositionSelectCard.js"

export function registerPositionContext(deps: {
  im: FeishuIM
}): { cardActionHandler: CardActionHandler; menuHandler: ReturnType<typeof makePositionSelectMenuHandler> } {
  const linkHandler = makeLinkPositionCardActionHandler(deps.im)
  const selectHandler = makePositionSelectCardActionHandler(deps.im)

  return {
    cardActionHandler: async (envelope) => {
      const linkResponse = await linkHandler(envelope)
      if (linkResponse) return linkResponse
      return selectHandler(envelope)
    },
    menuHandler: makePositionSelectMenuHandler(deps.im),
  }
}
