import {
  CLARIFICATION_H5_URL,
  LINK_POSITION_CONFIRM_ACTION,
  LINK_POSITION_SELECT_ACTION,
} from "./constants.js"
import { MOCK_POSITIONS } from "./mockPositions.js"
import { MOCK_RECRUITMENT_PLATFORMS } from "./mockPlatforms.js"

export interface LinkPositionCardContext {
  positionId: string
  positionName: string
}

function buildPositionSelectOptions() {
  return MOCK_POSITIONS.map((position) => ({
    text: { tag: "plain_text", content: position.name },
    value: position.id,
  }))
}

export function buildLinkPositionCard(context: LinkPositionCardContext) {
  const elements: unknown[] = [
    {
      tag: "div",
      text: {
        tag: "plain_text",
        content: `请为【${context.positionName}】关联各平台职位`,
      },
    },
    { tag: "hr" },
  ]

  for (const platform of MOCK_RECRUITMENT_PLATFORMS) {
    elements.push(
      {
        tag: "div",
        text: { tag: "plain_text", content: platform.name },
      },
      {
        tag: "action",
        actions: [
          {
            tag: "select_static",
            placeholder: { tag: "plain_text", content: "请选择职位" },
            options: buildPositionSelectOptions(),
            value: {
              action: LINK_POSITION_SELECT_ACTION,
              platformId: platform.id,
              field: "platform_position",
            },
          },
        ],
      },
      { tag: "hr" },
    )
  }

  if ((elements[elements.length - 1] as { tag?: string }).tag === "hr") {
    elements.pop()
  }

  elements.push({
    tag: "action",
    actions: [
      {
        tag: "button",
        text: { tag: "plain_text", content: "确认" },
        type: "primary",
        value: {
          action: LINK_POSITION_CONFIRM_ACTION,
          positionId: context.positionId,
          positionName: context.positionName,
        },
      },
    ],
  })

  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: "关联职位" },
    },
    elements,
  }
}

export function buildClarificationCard(positionName: string) {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: {
        tag: "plain_text",
        content: `您有一个新职位【${positionName}】待澄清`,
      },
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: [
            `您好，检测到新职位【${positionName}】已进入系统。`,
            "为了避免仅根据JD字面内容进行人才搜索，我整理了一组关键澄清问题。预计3-5分钟完成，确认后将自动生成职位画像和筛选标准。",
          ].join("\n"),
        },
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: { tag: "plain_text", content: "开始澄清" },
            type: "primary",
            url: CLARIFICATION_H5_URL,
          },
        ],
      },
    ],
  }
}
