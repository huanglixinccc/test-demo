export interface RecruitmentPlatform {
  id: string
  name: string
}

export const MOCK_RECRUITMENT_PLATFORMS: RecruitmentPlatform[] = [
  { id: "platform_boss", name: "boss 直聘" },
  { id: "platform_liepin", name: "猎聘" },
  { id: "platform_demand", name: "需求平台" },
  { id: "platform_moka", name: "moka" },
]

export function findRecruitmentPlatform(platformId: string): RecruitmentPlatform | undefined {
  return MOCK_RECRUITMENT_PLATFORMS.find((p) => p.id === platformId)
}
