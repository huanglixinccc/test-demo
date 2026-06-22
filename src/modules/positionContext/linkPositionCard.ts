import {
  LINK_POSITION_CONFIRM_ACTION,
  LINK_POSITION_SELECT_ACTION,
  START_CLARIFICATION_ACTION,
} from "./constants.js"
import {
  MOCK_PLATFORM_POSITIONS,
  MOCK_RECRUITMENT_PLATFORMS,
  isPositionFullyLinked,
  type RecruitmentPlatform,
} from "./mockPlatforms.js"

export interface LinkPositionCardState {
  /** 触发选择的平台行（用于在旁边展示关联表格） */
  expandedPlatformId: string | null
  pendingPositionId: string | null
}

const EMPTY_STATE: LinkPositionCardState = {
  expandedPlatformId: null,
  pendingPositionId: null,
}

function buildPositionSelectOptions() {
  return MOCK_PLATFORM_POSITIONS.map((position) => ({
    text: { tag: "plain_text", content: position.name },
    value: position.id,
  }))
}

function buildPlatformLinkCheckboxTable(platformId: string) {
  return [
    {
      tag: "div",
      text: {
        tag: "lark_md",
        content: [
          "| 平台 | 说明 |",
          "| --- | --- |",
          ...MOCK_RECRUITMENT_PLATFORMS.map(
            (platform) => `| ☐ ${platform.name} | 勾选后关联该平台的职位 |`,
          ),
        ].join("\n"),
      },
    },
    {
      tag: "action",
      actions: [
        {
          tag: "multi_select_static",
          placeholder: { tag: "plain_text", content: "请选择需要关联的平台" },
          options: MOCK_RECRUITMENT_PLATFORMS.map((platform) => ({
            text: { tag: "plain_text", content: platform.name },
            value: platform.id,
          })),
          value: {
            action: LINK_POSITION_SELECT_ACTION,
            platformId,
            field: "link_platforms",
          },
        },
      ],
    },
  ]
}

function buildPlatformRow(platform: RecruitmentPlatform, state: LinkPositionCardState) {
  const rows: unknown[] = [
    {
      tag: "column_set",
      flex_mode: "none",
      columns: [
        {
          tag: "column",
          width: "weighted",
          weight: 1,
          elements: [
            {
              tag: "div",
              text: { tag: "plain_text", content: platform.name },
            },
          ],
        },
        {
          tag: "column",
          width: "weighted",
          weight: 2,
          elements: [
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
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ]

  const shouldExpand =
    state.expandedPlatformId === platform.id &&
    state.pendingPositionId &&
    !isPositionFullyLinked(state.pendingPositionId)

  if (shouldExpand) {
    rows.push(...buildPlatformLinkCheckboxTable(platform.id))
  }

  return rows
}

export function buildLinkPositionCard(state: LinkPositionCardState = EMPTY_STATE) {
  const elements: unknown[] = []

  for (const platform of MOCK_RECRUITMENT_PLATFORMS) {
    elements.push(...buildPlatformRow(platform, state))
    elements.push({ tag: "hr" })
  }

  if (elements.length > 0 && (elements[elements.length - 1] as { tag?: string }).tag === "hr") {
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
          platformId: state.expandedPlatformId,
          positionId: state.pendingPositionId,
        },
      },
    ],
  })

  return {
    config: { wide_screen_mode: true, update_multi: true },
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
            type: "default",
            value: { action: START_CLARIFICATION_ACTION },
          },
        ],
      },
    ],
  }
}

export function buildLinkPositionCardUpdate(state: LinkPositionCardState) {
  return {
    card: {
      type: "raw",
      data: buildLinkPositionCard(state),
    },
  }
}
