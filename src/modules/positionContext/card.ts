import { SELECT_POSITION_ACTION } from "./constants.js"
import type { WorkspacePosition } from "./types.js"

function formatStatus(position: WorkspacePosition): string {
  const enabled = position.enabled ? "✅ 已启用" : "❌ 已停用"
  const bound = position.accountBound ? "✅ 已绑号" : "❌ 未绑号"
  return `${enabled} · ${bound}`
}

function formatCurrentSummary(current: WorkspacePosition | null): string {
  if (!current) return "**当前职位：** 未选择"
  return `**当前职位：** ${current.name}（${current.address}）`
}

export function buildPositionSelectCard(
  positions: WorkspacePosition[],
  currentPositionId: string | null,
) {
  const current = currentPositionId
    ? positions.find((p) => p.id === currentPositionId) ?? null
    : null

  const elements: unknown[] = [
    {
      tag: "div",
      text: {
        tag: "lark_md",
        content: formatCurrentSummary(current),
      },
    },
    { tag: "hr" },
  ]

  for (const position of positions) {
    const isCurrent = position.id === currentPositionId
    elements.push(
      {
        tag: "div",
        fields: [
          {
            is_short: false,
            text: {
              tag: "lark_md",
              content: `**${position.name}**${isCurrent ? "  `当前`" : ""}\n${position.address}\n${formatStatus(position)}`,
            },
          },
        ],
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: {
              tag: "plain_text",
              content: isCurrent ? "当前职位" : "选择",
            },
            type: isCurrent ? "default" : "primary",
            value: {
              action: SELECT_POSITION_ACTION,
              positionId: position.id,
            },
          },
        ],
      },
      { tag: "hr" },
    )
  }

  elements.push({
    tag: "note",
    elements: [
      {
        tag: "plain_text",
        content: "点击「选择」切换当前工作区职位，后续操作将基于所选职位进行。",
      },
    ],
  })

  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: "选择工作区职位" },
    },
    elements,
  }
}

export function buildPositionSelectedResponse(position: WorkspacePosition) {
  return {
    toast: {
      type: "success",
      content: `已切换到：${position.name}`,
    },
  }
}

export function buildPositionAlreadyCurrentResponse(position: WorkspacePosition) {
  return {
    toast: {
      type: "info",
      content: `当前已是：${position.name}`,
    },
  }
}
