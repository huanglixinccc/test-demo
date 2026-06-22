import type { FeishuEventDispatcher } from "../../webhook/dispatcher.js"
import type { FeishuIM } from "../../feishu/im.js"
import { MENU_EVENT_TYPE } from "./constants.js"
import { makeAccountBindingMenuHandler } from "./handler.js"

export { BIND_ACCOUNT_EVENT_KEY, BINDING_URL, MENU_EVENT_TYPE } from "./constants.js"
export { buildBindingCard } from "./card.js"

export function registerAccountBinding(deps: {
  dispatcher: FeishuEventDispatcher
  im: FeishuIM
}): void {
  deps.dispatcher.register(MENU_EVENT_TYPE, makeAccountBindingMenuHandler(deps.im))
}
