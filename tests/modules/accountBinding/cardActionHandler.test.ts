import { describe, it, expect, vi } from "vitest"
import { makeAccountBindingCardActionHandler } from "../../../src/modules/accountBinding/cardActionHandler.js"
import { START_BINDING_ACTION, BINDING_CHANNEL_OPEN_URL } from "../../../src/modules/accountBinding/constants.js"
import type { FeishuIM } from "../../../src/feishu/im.js"

function envelope(event: unknown) {
  return {
    schema: "2.0",
    header: {
      event_id: "e_card_1",
      event_type: "card.action.trigger",
      create_time: "x",
      token: "t",
      app_id: "a",
      tenant_key: "t",
    },
    event,
  }
}

function fakeIm(): FeishuIM {
  return {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    downloadMessageFile: vi.fn(),
  } as unknown as FeishuIM
}

describe("accountBinding card action handler", () => {
  it("sends template card and returns toast on start binding action", async () => {
    const im = fakeIm()
    const handler = makeAccountBindingCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_bind" },
      action: {
        value: { action: START_BINDING_ACTION },
        tag: "button",
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalledWith("ou_bind", {
      type: "template",
      data: { template_id: "AAqNR3G7hMhTQ" },
    })
    expect(response).toEqual({
      toast: { type: "info", content: "正在打开绑定表单…" },
    })
  })

  it("parses stringified action value", async () => {
    const im = fakeIm()
    const handler = makeAccountBindingCardActionHandler(im)

    await handler(envelope({
      operator: { open_id: "ou_bind" },
      action: {
        value: JSON.stringify({ action: START_BINDING_ACTION }),
      },
    }))

    expect(im.sendCardToUser).toHaveBeenCalled()
  })

  it("returns null for unrelated card actions", async () => {
    const im = fakeIm()
    const handler = makeAccountBindingCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_bind" },
      action: { value: { action: "other_action" } },
    }))

    expect(response).toBeNull()
    expect(im.sendCardToUser).not.toHaveBeenCalled()
  })

  it("returns error toast when template send fails", async () => {
    const im = fakeIm()
    vi.mocked(im.sendCardToUser).mockRejectedValue(new Error("200381"))
    const handler = makeAccountBindingCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_bind" },
      action: { value: { action: START_BINDING_ACTION } },
    }))

    expect(response).toEqual({
      toast: {
        type: "error",
        content: "打开绑定表单失败，请确认应用已授权该卡片模板",
      },
    })
  })

  it("logs submit result and notifies user on template card submit", async () => {
    const im = fakeIm()
    const handler = makeAccountBindingCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_bind" },
      action: {
        tag: "button",
        form_value: {
          Select_m7d0zq95: "1",
          Select_wonbj1gybhe: "1",
        },
        name: "Button_m7t30yjl",
      },
    }))

    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_bind", "绑定成功")
    expect(response).toEqual({
      toast: { type: "success", content: "绑定成功" },
      open_url: BINDING_CHANNEL_OPEN_URL,
    })
  })

  it("triggers afterBindingSuccess on submit", async () => {
    const im = fakeIm()
    const afterBindingSuccess = vi.fn().mockResolvedValue(undefined)
    const handler = makeAccountBindingCardActionHandler(im, { afterBindingSuccess })

    await handler(envelope({
      operator: { open_id: "ou_bind" },
      action: {
        form_value: {
          Select_m7d0zq95: "1",
          Select_wonbj1gybhe: "1",
        },
      },
    }))

    expect(afterBindingSuccess).toHaveBeenCalledWith("ou_bind")
  })

  it("logs submit result for card_submit_data payload", async () => {
    const im = fakeIm()
    const handler = makeAccountBindingCardActionHandler(im)

    const response = await handler(envelope({
      operator: { open_id: "ou_bind" },
      action: {
        value: {
          card_submit_data: {
            channel: ["渠道编码1", "渠道编码2"],
            account: ["账号1", "账号2"],
          },
        },
      },
    }))

    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_bind", "绑定成功")
    expect(response).toEqual({
      toast: { type: "success", content: "绑定成功" },
      open_url: BINDING_CHANNEL_OPEN_URL,
    })
  })
})
