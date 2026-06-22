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

/** 代码构建的绑定表单卡片，提交按钮同时跳转渠道页面并回传表单数据 */
export function buildBindingSelectCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: "绑定渠道账号" },
    },
    elements: [
      {
        tag: "div",
        text: { tag: "plain_text", content: "请选择招聘渠道和账号，点击提交后将自动打开渠道页面" },
      },
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
            text: { tag: "plain_text", content: "提交" },
            type: "primary",
            complex_interaction: true,
            behaviors: [
              {
                type: "open_url",
                default_url: BINDING_CHANNEL_OPEN_URL,
                pc_url: BINDING_CHANNEL_OPEN_URL,
                android_url: BINDING_CHANNEL_OPEN_URL,
                ios_url: BINDING_CHANNEL_OPEN_URL,
              },
              { type: "form_action", behavior: "submit" },
            ],
          },
        ],
      },
    ],
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

export const BINDING_SUCCESS_MESSAGE = "绑定成功"
