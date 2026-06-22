export interface PlatformPositionOption {
  id: string
  name: string
  /** 是否已在全部 4 个平台完成关联（不在卡片上展示） */
  allPlatformsLinked: boolean
}

export interface RecruitmentPlatform {
  id: string
  name: string
}

export const MOCK_PLATFORM_POSITIONS: PlatformPositionOption[] = [
  { id: "pos_hrbp", name: "HRBP", allPlatformsLinked: true },
  { id: "pos_fe", name: "前端工程师", allPlatformsLinked: false },
  { id: "pos_be", name: "后端工程师", allPlatformsLinked: false },
]

export const MOCK_RECRUITMENT_PLATFORMS: RecruitmentPlatform[] = [
  { id: "platform_boss", name: "boss 直聘" },
  { id: "platform_liepin", name: "猎聘" },
  { id: "platform_demand", name: "需求平台" },
  { id: "platform_moka", name: "moka" },
]

export function findRecruitmentPlatform(platformId: string): RecruitmentPlatform | undefined {
  return MOCK_RECRUITMENT_PLATFORMS.find((p) => p.id === platformId)
}

export function findPlatformPosition(positionId: string): PlatformPositionOption | undefined {
  return MOCK_PLATFORM_POSITIONS.find((p) => p.id === positionId)
}

export function isPositionFullyLinked(positionId: string): boolean {
  return findPlatformPosition(positionId)?.allPlatformsLinked ?? false
}
