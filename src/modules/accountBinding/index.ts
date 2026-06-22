import type { FeishuEventDispatcher } from "../../webhook/dispatcher.js"
import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { MENU_EVENT_TYPE } from "./constants.js"
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
  dispatcher: FeishuEventDispatcher
  im: FeishuIM
}): { cardActionHandler: CardActionHandler } {
  deps.dispatcher.register(MENU_EVENT_TYPE, makeAccountBindingMenuHandler(deps.im))
  return { cardActionHandler: makeAccountBindingCardActionHandler(deps.im) }
}
