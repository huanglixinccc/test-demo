import { describe, it, expect, vi } from "vitest"
import {
  buildContactableCandidateAlertCard,
  buildFirstRoundSearchConfirmationCard,
  buildLowScreenRateAlertCard,
  buildSyncPositionReminderCard,
  MOCK_CONTACTABLE_CANDIDATE_ALERT,
  MOCK_FIRST_ROUND_SEARCH_CONFIRMATION,
  MOCK_LOW_SCREEN_RATE_ALERT,
  MOCK_SYNC_POSITION_REMINDER,
} from "../../../src/modules/positionContext/notificationCards.js"
import {
  sendCustomNotification,
  sendNotificationCard,
  SendNotificationError,
  resolveNotificationOpenId,
  resolveNotificationOpenIds,
} from "../../../src/modules/positionContext/sendNotification.js"
import { DEMO_NOTIFICATION_OPEN_ID } from "../../../src/modules/positionContext/constants.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

function fakeIm(): FeishuIM {
  return {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    downloadMessageFile: vi.fn(),
  } as unknown as FeishuIM
}

describe("sendNotification", () => {
  it("builds low screen rate alert card with strategy suggestion button", () => {
    const card = buildLowScreenRateAlertCard()
    const serialized = JSON.stringify(card)

    expect(card.header.title.content).toBe(MOCK_LOW_SCREEN_RATE_ALERT.title)
    expect(serialized).toContain("过筛率仅为")
    expect(serialized).toContain("寻聘策略建议修改")
    expect(serialized).toContain("寻聘策略修改建议")
    expect(serialized).toContain('"tag":"action"')
  })

  it("sends card to demo openId by default", async () => {
    const im = fakeIm()
    const card = buildLowScreenRateAlertCard()

    const result = await sendNotificationCard(im, card)

    expect(result).toEqual({ openId: DEMO_NOTIFICATION_OPEN_ID })
    expect(im.sendCardToUser).toHaveBeenCalledWith(DEMO_NOTIFICATION_OPEN_ID, card)
  })

  it("sends custom notification with frontend title and content", async () => {
    const im = fakeIm()

    await sendCustomNotification(im, {
      title: "【测试】自定义标题",
      content: "自定义正文",
    })

    expect(im.sendCardToUser).toHaveBeenCalledWith(
      DEMO_NOTIFICATION_OPEN_ID,
      expect.objectContaining({
        header: expect.objectContaining({
          title: expect.objectContaining({ content: "【测试】自定义标题" }),
        }),
      }),
    )
  })

  it("rejects empty custom title", async () => {
    const im = fakeIm()
    await expect(
      sendCustomNotification(im, { title: " ", content: "正文" }),
    ).rejects.toBeInstanceOf(SendNotificationError)
  })

  it("resolveNotificationOpenId uses body openId when provided", () => {
    expect(resolveNotificationOpenId({ openId: "ou_custom" })).toBe("ou_custom")
    expect(resolveNotificationOpenId({})).toBe(DEMO_NOTIFICATION_OPEN_ID)
  })

  it("resolveNotificationOpenIds supports single openId", () => {
    expect(resolveNotificationOpenIds({ openId: "ou_custom" })).toEqual(["ou_custom"])
    expect(resolveNotificationOpenIds({})).toEqual([DEMO_NOTIFICATION_OPEN_ID])
  })
})

describe("notification cards", () => {
  it("builds low screen rate alert mock card", () => {
    const card = buildLowScreenRateAlertCard()
    expect(card.header.title.content).toBe(MOCK_LOW_SCREEN_RATE_ALERT.title)
    expect(JSON.stringify(card)).toContain("18.6%")
    expect(JSON.stringify(card)).toContain("寻聘策略建议修改")
  })

  it("builds sync position reminder mock card", () => {
    const card = buildSyncPositionReminderCard()
    expect(card.header.title.content).toBe(MOCK_SYNC_POSITION_REMINDER.title)
    expect(JSON.stringify(card)).toContain("3 个新职位")
  })

  it("builds first round search confirmation mock card", () => {
    const card = buildFirstRoundSearchConfirmationCard()
    expect(card.header.title.content).toBe(MOCK_FIRST_ROUND_SEARCH_CONFIRMATION.title)
    expect(JSON.stringify(card)).toContain("首轮人才寻访")
    expect(JSON.stringify(card)).toContain("候选人整体方向是否符合预期")
  })

  it("builds contactable candidate alert mock card", () => {
    const card = buildContactableCandidateAlertCard()
    expect(card.header.title.content).toBe(MOCK_CONTACTABLE_CANDIDATE_ALERT.title)
    expect(JSON.stringify(card)).toContain("李先生")
    expect(JSON.stringify(card)).toContain("hrp.taient.com/candidate_detail")
  })
})
