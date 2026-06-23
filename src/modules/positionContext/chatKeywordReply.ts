import type { FeishuIM } from "../../feishu/im.js"
import { logger } from "../../utils/logger.js"
import {
  buildLowGreetingCard,
  buildManualRejectionReasonAnalysisCard,
  buildPendingCandidatesCard,
  buildRecruitmentDataCard,
  buildRecruitmentModelCard,
  buildRejectionReasonAnalysisCard,
  buildSearchStrategyTemplateCard,
  buildStrategyTemplateSuggestionCard,
  buildTodayDataCard,
  buildTodayProgressCard,
  FIXED_CHAT_TEXT_REPLIES,
} from "./chatKeywordCards.js"
import { DEMO_CLARIFICATION_POSITION_NAME } from "./constants.js"
import { buildClarificationCard, buildRecruitmentStrategyCard } from "./linkPositionCard.js"
import {
  isClarificationIntent,
  isLowGreetingIntent,
  isManualRejectionIntent,
  isPendingCandidatesIntent,
  isRecruitmentDataIntent,
  isRecruitmentModelIntent,
  isRejectionReasonIntent,
  isSearchStrategyIntent,
  isStartRecruitmentTaskIntent,
  isStrategyTemplateSuggestionIntent,
  isTodayDataIntent,
  isTodayProgressIntent,
} from "./chatKeywordIntents.js"

/** 根据私聊关键词或固定文案回复卡片/文本 */
export async function dispatchChatKeywordReply(
  im: FeishuIM,
  openId: string,
  text: string,
): Promise<void> {
  if (isRecruitmentDataIntent(text)) {
    logger.info({ openId }, "chatKeyword.recruitment_data")
    await im.sendCardToUser(openId, buildRecruitmentDataCard())
    return
  }

  if (isStrategyTemplateSuggestionIntent(text)) {
    logger.info({ openId }, "chatKeyword.strategy_template_suggestion")
    await im.sendCardToUser(openId, buildStrategyTemplateSuggestionCard())
    return
  }

  if (isLowGreetingIntent(text)) {
    logger.info({ openId }, "chatKeyword.low_greeting")
    await im.sendCardToUser(openId, buildLowGreetingCard())
    return
  }

  if (isTodayProgressIntent(text)) {
    logger.info({ openId }, "chatKeyword.today_progress")
    await im.sendCardToUser(openId, buildTodayProgressCard())
    return
  }

  if (isTodayDataIntent(text)) {
    logger.info({ openId }, "chatKeyword.today_data")
    await im.sendCardToUser(openId, buildTodayDataCard())
    return
  }

  if (isPendingCandidatesIntent(text)) {
    logger.info({ openId }, "chatKeyword.pending_candidates")
    await im.sendCardToUser(openId, buildPendingCandidatesCard())
    return
  }

  if (isRecruitmentModelIntent(text)) {
    logger.info({ openId }, "chatKeyword.recruitment_model")
    await im.sendCardToUser(openId, buildRecruitmentModelCard())
    return
  }

  if (isSearchStrategyIntent(text)) {
    logger.info({ openId }, "chatKeyword.search_strategy")
    await im.sendCardToUser(openId, buildSearchStrategyTemplateCard())
    return
  }

  if (isManualRejectionIntent(text)) {
    logger.info({ openId }, "chatKeyword.manual_rejection_reason")
    await im.sendCardToUser(openId, buildManualRejectionReasonAnalysisCard())
    return
  }

  if (isRejectionReasonIntent(text)) {
    logger.info({ openId }, "chatKeyword.rejection_reason")
    await im.sendCardToUser(openId, buildRejectionReasonAnalysisCard())
    return
  }

  if (isClarificationIntent(text)) {
    logger.info({ openId, positionName: DEMO_CLARIFICATION_POSITION_NAME }, "chatKeyword.clarification")
    await im.sendCardToUser(openId, buildClarificationCard(DEMO_CLARIFICATION_POSITION_NAME))
    return
  }

  if (isStartRecruitmentTaskIntent(text)) {
    logger.info(
      { openId, positionName: DEMO_CLARIFICATION_POSITION_NAME },
      "chatKeyword.start_recruitment_task",
    )
    await im.sendCardToUser(
      openId,
      buildRecruitmentStrategyCard(DEMO_CLARIFICATION_POSITION_NAME),
    )
    return
  }

  const fixedReply = FIXED_CHAT_TEXT_REPLIES[text]
  if (fixedReply) {
    logger.info({ openId, text }, "chatKeyword.fixed_text")
    await im.sendTextToUser(openId, fixedReply)
    return
  }

  logger.info({ openId, text }, "chatKeyword.plain_text")
  await im.sendTextToUser(openId, text)
}
