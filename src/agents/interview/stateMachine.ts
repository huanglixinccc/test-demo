import type { CandidateStatus, ReviewResult } from "../../feishu/bitable.js"

export function nextCandidateStatus(
  current: CandidateStatus,
  review: ReviewResult,
): CandidateStatus {
  if (review === "淘汰") return "淘汰"
  if (review === "待定") return current
  switch (current) {
    case "待筛选":
    case "初筛通过":
      return "技术面"
    case "技术面":
      return "HR面"
    case "HR面":
      return "Offer"
    case "Offer":
    case "入职":
    case "淘汰":
    default:
      return current
  }
}
