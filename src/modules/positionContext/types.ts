export interface WorkspacePosition {
  id: string
  name: string
  address: string
  enabled: boolean
  accountBound: boolean
  /** 是否已在全部平台完成关联（不在卡片上展示，第一个职位默认 true） */
  platformLinked: boolean
}
