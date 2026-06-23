import type { CardActionHandler } from "../../webhook/cardAction.js"
import type { FeishuIM } from "../../feishu/im.js"
import { makePositionSelectMenuHandler } from "./menuHandler.js"
import { makePositionSelectCardActionHandler } from "./cardActionHandler.js"
import { makeLinkPositionCardActionHandler } from "./linkPositionCardActionHandler.js"
import { makeChatKeywordCardActionHandler } from "./chatKeywordCardActionHandler.js"

export {
  MENU_EVENT_TYPE,
  LINK_POSITION_CONFIRM_ACTION,
  LINK_POSITION_SELECT_ACTION,
  SELECT_POSITIONS_EVENT_KEY,
  SELECT_POSITION_ACTION,
  CLARIFICATION_H5_URL,
  DEMO_CLARIFICATION_POSITION_NAME,
  DEMO_NOTIFICATION_OPEN_ID,
  DEMO_NOTIFICATION_RECIPIENT_NAME,
} from "./constants.js"
export type { WorkspacePosition } from "./types.js"
export { MOCK_RECRUITMENT_PLATFORMS, findRecruitmentPlatform } from "./mockPlatforms.js"
export {
  MOCK_POSITIONS,
  findMockPosition,
  isWorkspacePositionPlatformLinked,
  isWorkspacePositionClarified,
} from "./mockPositions.js"
export { positionContextStore, PositionContextStore } from "./store.js"
export { buildPositionSelectCard } from "./card.js"
export { buildClarificationCard, buildLinkPositionCard, buildRecruitmentStrategyCard } from "./linkPositionCard.js"
export {
  buildManualRejectionReasonAnalysisCard,
  buildRecruitmentDataCard,
  buildRejectionReasonAnalysisCard,
  buildSearchStrategyTemplateCard,
  buildStrategyTemplateSuggestionCard,
  buildTaskClosedCard,
  TASK_CLOSED_LINK_ACTION,
  TASK_CLOSED_LINKS,
} from "./chatKeywordCards.js"
export { dispatchChatKeywordReply } from "./chatKeywordReply.js"
export {
  isClarificationIntent,
  isManualRejectionIntent,
  isRecruitmentDataIntent,
  isRejectionReasonIntent,
  isSearchStrategyIntent,
  isStartRecruitmentTaskIntent,
  isStrategyTemplateSuggestionIntent,
  isTaskClosedIntent,
} from "./chatKeywordIntents.js"
export { sendPositionSelectCard } from "./sendPositionSelectCard.js"
export {
  triggerClarification,
  TriggerClarificationError,
  normalizeOpenIds,
} from "./triggerClarification.js"
export {
  sendNotificationCard,
  sendCustomNotification,
  SendNotificationError,
  resolveNotificationOpenId,
  resolveNotificationOpenIds,
} from "./sendNotification.js"
export {
  buildCustomNotificationCard,
  buildLowScreenRateAlertCard,
  buildSyncPositionReminderCard,
  MOCK_LOW_SCREEN_RATE_ALERT,
  MOCK_SYNC_POSITION_REMINDER,
} from "./notificationCards.js"

export function registerPositionContext(deps: {
  im: FeishuIM
}): { cardActionHandler: CardActionHandler; menuHandler: ReturnType<typeof makePositionSelectMenuHandler> } {
  const chatKeywordHandler = makeChatKeywordCardActionHandler(deps.im)
  const linkHandler = makeLinkPositionCardActionHandler(deps.im)
  const selectHandler = makePositionSelectCardActionHandler(deps.im)

  return {
    cardActionHandler: async (envelope) => {
      const chatKeywordResponse = await chatKeywordHandler(envelope)
      if (chatKeywordResponse) return chatKeywordResponse
      const linkResponse = await linkHandler(envelope)
      if (linkResponse) return linkResponse
      return selectHandler(envelope)
    },
    menuHandler: makePositionSelectMenuHandler(deps.im),
  }
}
