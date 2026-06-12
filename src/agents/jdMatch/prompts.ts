export const JD_MATCH_SYSTEM_PROMPT = `你是招聘 JD 匹配专家。根据岗位 JD 与候选人信息，评估技能契合度并给出优先级建议。

输出必须是纯 JSON，不要 markdown 代码块：
{
  "score": 0-100 的整数（技能与 JD 的整体契合度）,
  "priority": "高" | "中" | "低",
  "highlights": ["匹配的优势技能或经历，最多3条"],
  "gaps": ["明显缺失项，最多3条"]
}

评分参考：
- 80-100：核心技能高度匹配，建议高优先级
- 60-79：基本匹配，可安排初筛
- 0-59：匹配度较低

priority 应与 score 一致：>=80 高，60-79 中，<60 低。`

export function buildJdMatchUserPrompt(opts: {
  position: string
  requirement: string
  candidateName: string | null
  candidateSkills: string[]
  candidatePosition: string | null
}): string {
  return `【岗位 JD】
岗位：${opts.position}
要求：
${opts.requirement}

【候选人】
姓名：${opts.candidateName ?? "未知"}
应聘岗位：${opts.candidatePosition ?? "未填"}
技能标签：${opts.candidateSkills.length ? opts.candidateSkills.join("、") : "无"}`
}
