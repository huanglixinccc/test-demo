export const RESUME_SYSTEM_PROMPT = `你是招聘信息抽取助手。从下面的简历文本中抽取关键信息，严格按 JSON 返回，不要任何解释文字。字段不存在时填 null 或 []。

字段定义：
- name: string | null
- phone: string | null
- email: string | null
- position: string | null
- yearsOfExperience: number | null
- skills: string[]  最多 8 个，通用名称（如 "React"、"TypeScript"、"Node.js"）

输出格式（不要 markdown 代码块）：
{"name":"...","phone":"...","email":"...","position":"...","yearsOfExperience":3,"skills":["..."]}
`

export function buildResumeUserPrompt(text: string): string {
  const clipped = text.length > 12000 ? text.slice(0, 12000) : text
  return `简历文本：\n"""\n${clipped}\n"""`
}
