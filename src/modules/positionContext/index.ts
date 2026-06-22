import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { makePositionSelectMenuHandler } from "./menuHandler.js"
import { makePositionSelectCardActionHandler } from "./cardActionHandler.js"

export {
  MENU_EVENT_TYPE,
  SELECT_POSITIONS_EVENT_KEY,
  SELECT_POSITION_ACTION,
} from "./constants.js"
export type { WorkspacePosition } from "./types.js"
export { MOCK_POSITIONS, findMockPosition } from "./mockPositions.js"
export { positionContextStore, PositionContextStore } from "./store.js"
export { buildPositionSelectCard } from "./card.js"

export function registerPositionContext(deps: {
  im: FeishuIM
}): { cardActionHandler: CardActionHandler; menuHandler: ReturnType<typeof makePositionSelectMenuHandler> } {
  return {
    cardActionHandler: makePositionSelectCardActionHandler(deps.im),
    menuHandler: makePositionSelectMenuHandler(deps.im),
  }
}
