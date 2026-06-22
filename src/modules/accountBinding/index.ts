import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { makeAccountBindingMenuHandler } from "./handler.js"
import { makeAccountBindingCardActionHandler } from "./cardActionHandler.js"

export {
  BIND_ACCOUNT_EVENT_KEY,
  BINDING_SELECT_CARD_TEMPLATE_ID,
  CARD_ACTION_EVENT_TYPE,
  MENU_EVENT_TYPE,
  START_BINDING_ACTION,
} from "./constants.js"
export { buildBindingCard, buildSelectTemplateCardResponse } from "./card.js"

export function registerAccountBinding(deps: {
  im: FeishuIM
}): { cardActionHandler: CardActionHandler; menuHandler: ReturnType<typeof makeAccountBindingMenuHandler> } {
  return {
    cardActionHandler: makeAccountBindingCardActionHandler(deps.im),
    menuHandler: makeAccountBindingMenuHandler(deps.im),
  }
}
