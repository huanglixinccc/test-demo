import {
  CLARIFICATION_H5_URL,
  LINK_POSITION_CONFIRM_ACTION,
  LINK_POSITION_SELECT_ACTION,
  MOCK_RECRUITMENT_STRATEGY_TEMPLATE,
  START_CLARIFICATION_ACTION,
  START_RECRUITMENT_ACTION,
} from "./constants.js"
import { MOCK_POSITIONS } from "./mockPositions.js"
import { MOCK_RECRUITMENT_PLATFORMS } from "./mockPlatforms.js"

export interface LinkPositionCardContext {
  positionId: string
  positionName: string
}

function buildFeishuSidebarOpenUrl(url: string): string {
  return `https://applink.feishu.cn/client/web_url/open?mode=sidebar-semi&max_width=800&reload=false&url=${encodeURIComponent(url)}`
}

function buildClarificationOpenUrlBehavior() {
  return {
    type: "open_url",
    default_url: CLARIFICATION_H5_URL,
    pc_url: buildFeishuSidebarOpenUrl(CLARIFICATION_H5_URL),
    android_url: CLARIFICATION_H5_URL,
    ios_url: CLARIFICATION_H5_URL,
  } as const
}
function buildPositionSelectOptions() {
  return MOCK_POSITIONS.map((position) => ({
    text: { tag: "plain_text", content: position.name },
    value: position.id,
  }))
}

function buildPlatformColumn(platform: (typeof MOCK_RECRUITMENT_PLATFORMS)[number]) {
  return {
    tag: "column",
    width: "weighted",
    weight: 1,
    vertical_align: "top",
    elements: [
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
    ],
  }
}

function buildPlatformColumnSets() {
  const columnSets: unknown[] = []
  for (let index = 0; index < MOCK_RECRUITMENT_PLATFORMS.length; index += 2) {
    const pair = MOCK_RECRUITMENT_PLATFORMS.slice(index, index + 2)
    columnSets.push({
      tag: "column_set",
      flex_mode: "bisect",
      horizontal_spacing: "default",
      columns: pair.map((platform) => buildPlatformColumn(platform)),
    })
    if (index + 2 < MOCK_RECRUITMENT_PLATFORMS.length) {
      columnSets.push({ tag: "hr" })
    }
  }
  return columnSets
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
    ...buildPlatformColumnSets(),
  ]

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

export function buildClarificationCard(
  positionName: string,
  options?: { buttonType?: "primary_filled" | "default_text" },
) {
  return {
    schema: "2.0",
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: {
        tag: "plain_text",
        content: `您有一个新职位【${positionName}】待澄清`,
      },
    },
    body: {
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
          tag: "button",
          type: options?.buttonType ?? "primary_filled",
          text: { tag: "plain_text", content: "开始澄清" },
          behaviors: [
            buildClarificationOpenUrlBehavior(),
            {
              type: "callback",
              value: {
                action: START_CLARIFICATION_ACTION,
                positionName,
              },
            },
          ],
        },
      ],
    },
  }
}

export function buildRecruitmentStrategyCard(positionName: string) {
  return {
    config: { wide_screen_mode: true },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**【${positionName}】寻聘策略已生成**`,
        },
      },
      {
        tag: "div",
        text: {
          tag: "plain_text",
          content: `已自动匹配【${MOCK_RECRUITMENT_STRATEGY_TEMPLATE}】策略模板，可以开启寻聘了。`,
        },
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: { tag: "plain_text", content: "开启寻聘" },
            type: "primary",
            value: {
              action: START_RECRUITMENT_ACTION,
              positionName,
            },
          },
        ],
      },
    ],
  }
}
