export interface WorkspacePosition {
  id: string
  name: string
  address: string
  enabled: boolean
  accountBound: boolean
  /** 是否已在全部平台完成关联 */
  platformLinked: boolean
  /** 是否已完成职位澄清 */
  clarified: boolean
}
