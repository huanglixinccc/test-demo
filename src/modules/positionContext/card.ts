import { SELECT_POSITION_ACTION } from "./constants.js"
import type { WorkspacePosition } from "./types.js"

function formatStatus(position: WorkspacePosition): string {
  const enabled = position.enabled ? "启用" : "停用"
  const bound = position.accountBound ? "已绑号" : "未绑号"
  return `${enabled} · ${bound}`
}

function formatPositionLine(position: WorkspacePosition, isCurrent: boolean): string {
  const marker = isCurrent ? "**▸** " : ""
  return `${marker}${position.address} · **${position.name}** · ${formatStatus(position)}`
}

function buildPositionRow(position: WorkspacePosition, currentPositionId: string | null) {
  const isCurrent = position.id === currentPositionId

  return {
    tag: "action",
    actions: [
      {
        tag: "button",
        text: {
          tag: "lark_md",
          content: formatPositionLine(position, isCurrent),
        },
        type: isCurrent ? "primary" : "default",
        value: {
          action: SELECT_POSITION_ACTION,
          positionId: position.id,
        },
      },
    ],
  }
}

export function buildPositionSelectCard(
  positions: WorkspacePosition[],
  currentPositionId: string | null,
) {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: "blue",
      title: { tag: "plain_text", content: "选择工作区职位" },
    },
    elements: positions.map((position) => buildPositionRow(position, currentPositionId)),
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

export function buildPositionSelectCardCallbackResponse(
  positions: WorkspacePosition[],
  currentPositionId: string | null,
  toast: { type: string; content: string },
) {
  return {
    toast,
    card: {
      type: "raw",
      data: buildPositionSelectCard(positions, currentPositionId),
    },
  }
}
