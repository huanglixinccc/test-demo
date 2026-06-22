import { BINDING_URL } from "./constants.js"

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
        tag: "div",
        text: {
          tag: "lark_md",
          content: `[开始绑定](${BINDING_URL})`,
        },
      },
    ],
  }
}
