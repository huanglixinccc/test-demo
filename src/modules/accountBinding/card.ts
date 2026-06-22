import {
  BINDING_CHANNEL_OPEN_URL,
  BINDING_SELECT_CARD_TEMPLATE_ID,
  START_BINDING_ACTION,
} from "./constants.js"

export function buildBindingCard() {
  return {
    config: { wide_screen_mode: true },
    elements: [
      {
        tag: "div",
        text: {
          tag: "plain_text",
          content: "请选择你的招聘渠道和账号",
        },
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: {
              tag: "plain_text",
              content: "开始绑定",
            },
            type: "primary",
            value: {
              action: START_BINDING_ACTION,
            },
          },
        ],
      },
    ],
  }
}

export function buildSelectTemplateCardPayload() {
  return {
    type: "template",
    data: {
      template_id: BINDING_SELECT_CARD_TEMPLATE_ID,
    },
  }
}

export function buildSelectTemplateCardResponse() {
  return {
    toast: {
      type: "info",
      content: "正在打开绑定表单…",
    },
  }
}

export function buildBindingSuccessResponse() {
  return {
    toast: {
      type: "success",
      content: "绑定成功",
    },
  }
}

/** 绑定提交成功后发送，点击按钮打开渠道页面（与澄清卡片相同 url 跳转方式） */
export function buildBindingChannelOpenCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "green",
      title: { tag: "plain_text", content: "绑定成功" },
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: "账号已绑定，请点击下方按钮打开渠道页面完成登录。",
        },
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: { tag: "plain_text", content: "打开渠道页面" },
            type: "primary",
            url: BINDING_CHANNEL_OPEN_URL,
          },
        ],
      },
    ],
  }
}

export const BINDING_SUCCESS_MESSAGE = "绑定成功"
