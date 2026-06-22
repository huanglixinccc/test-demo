import type { WorkspacePosition } from "./types.js"

export const MOCK_POSITIONS: WorkspacePosition[] = [
  {
    id: "pos_fe",
    name: "前端工程师",
    address: "上海·张江",
    enabled: true,
    accountBound: true,
    platformLinked: true,
  },
  {
    id: "pos_be",
    name: "后端工程师",
    address: "北京·望京",
    enabled: true,
    accountBound: false,
    platformLinked: false,
  },
  {
    id: "pos_pm",
    name: "产品经理",
    address: "杭州·西溪",
    enabled: false,
    accountBound: false,
    platformLinked: false,
  },
]

export function findMockPosition(positionId: string): WorkspacePosition | undefined {
  return MOCK_POSITIONS.find((p) => p.id === positionId)
}

export function isWorkspacePositionPlatformLinked(positionId: string): boolean {
  return findMockPosition(positionId)?.platformLinked ?? false
}
