import dotenv from "dotenv"
dotenv.config()

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var: ${name}`)
  return value
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback
}

export const env = {
  port: Number(optional("PORT", "3000")),
  logLevel: optional("LOG_LEVEL", "info"),
  feishu: {
    appId: required("FEISHU_APP_ID"),
    appSecret: required("FEISHU_APP_SECRET"),
    verificationToken: required("FEISHU_VERIFICATION_TOKEN"),
    encryptKey: required("FEISHU_ENCRYPT_KEY"),
    bitableAppToken: required("FEISHU_BITABLE_APP_TOKEN"),
  },
  tables: {
    candidate: required("FEISHU_TABLE_CANDIDATE"),
    referral: required("FEISHU_TABLE_REFERRAL"),
    interview: required("FEISHU_TABLE_INTERVIEW"),
    jd: required("FEISHU_TABLE_JD"),
  },
  hrOpenIds: required("HR_OPEN_IDS").split(",").map((s) => s.trim()).filter(Boolean),
  deepseek: {
    apiKey: required("DEEPSEEK_API_KEY"),
    baseUrl: optional("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
    model: optional("DEEPSEEK_MODEL", "deepseek-chat"),
  },
}
