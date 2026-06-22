import {
  BINDING_CHANNEL_OPEN_URL,
  BINDING_FORM_ACCOUNT_FIELD,
  BINDING_FORM_CHANNEL_FIELD,
  BINDING_SELECT_CARD_TEMPLATE_ID,
  BINDING_SUBMIT_BUTTON_NAME,
  START_BINDING_ACTION,
} from "./constants.js"
import {
  buildBindingAccountSelectOptions,
  buildBindingChannelSelectOptions,
} from "./mockBindingOptions.js"

const BINDING_OPEN_URL_BEHAVIOR = {
  type: "open_url",
  default_url: BINDING_CHANNEL_OPEN_URL,
  pc_url: buildFeishuSidebarOpenUrl(BINDING_CHANNEL_OPEN_URL),
  android_url: BINDING_CHANNEL_OPEN_URL,
  ios_url: BINDING_CHANNEL_OPEN_URL,
} as const

function buildFeishuSidebarOpenUrl(url: string): string {
  return `https://applink.feishu.cn/client/web_url/open?mode=sidebar-semi&max_width=800&reload=false&url=${encodeURIComponent(url)}`
}

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

/**
 * JSON 2.0 绑定表单；提交按钮 form_action_type=submit + open_url，
 * 用户点一次「提交」即打开渠道页并回传表单数据。
 */
export function buildBindingSelectCard() {
  return {
    schema: "2.0",
    config: {
      wide_screen_mode: true,
      update_multi: true,
    },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: "请选择招聘渠道和账号" },
    },
    body: {
      elements: [
        {
          tag: "form",
          name: "binding_form",
          elements: [
            {
              tag: "div",
              text: { tag: "plain_text", content: "招聘渠道" },
            },
            {
              tag: "select_static",
              name: BINDING_FORM_CHANNEL_FIELD,
              placeholder: { tag: "plain_text", content: "请选择渠道" },
              options: buildBindingChannelSelectOptions(),
            },
            { tag: "hr" },
            {
              tag: "div",
              text: { tag: "plain_text", content: "渠道账号" },
            },
            {
              tag: "select_static",
              name: BINDING_FORM_ACCOUNT_FIELD,
              placeholder: { tag: "plain_text", content: "请选择账号" },
              options: buildBindingAccountSelectOptions(),
            },
            { tag: "hr" },
            {
              tag: "button",
              name: BINDING_SUBMIT_BUTTON_NAME,
              form_action_type: "submit",
              text: { tag: "plain_text", content: "提交" },
              type: "primary_filled",
              behaviors: [BINDING_OPEN_URL_BEHAVIOR],
            },
          ],
        },
      ],
    },
  }
}

export function buildSelectTemplateCardResponse() {
  return {
    toast: {
      type: "info",
      content: "正在打开绑定表单，请在最新卡片中提交",
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

export const BINDING_SUCCESS_MESSAGE = "绑定成功"
