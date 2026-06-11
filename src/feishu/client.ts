import axios, { type AxiosInstance } from "axios"
import { logger } from "../utils/logger.js"

export interface FeishuClientOptions {
  appId: string
  appSecret: string
  baseUrl?: string
  http?: AxiosInstance
}

export class FeishuClient {
  readonly http: AxiosInstance
  private readonly appId: string
  private readonly appSecret: string
  private tokenCache: { token: string; expiresAt: number } | undefined

  constructor(opts: FeishuClientOptions) {
    this.appId = opts.appId
    this.appSecret = opts.appSecret
    this.http =
      opts.http ??
      axios.create({
        baseURL: opts.baseUrl ?? "https://open.feishu.cn",
        timeout: 30_000,
      })
  }

  async getTenantAccessToken(): Promise<string> {
    const now = Date.now()
    if (this.tokenCache && this.tokenCache.expiresAt - 60_000 > now) {
      return this.tokenCache.token
    }
    const res = await this.http.post("/open-apis/auth/v3/tenant_access_token/internal", {
      app_id: this.appId,
      app_secret: this.appSecret,
    })
    const token = res.data?.tenant_access_token
    const expire = res.data?.expire
    if (typeof token !== "string" || typeof expire !== "number") {
      throw new Error(`Failed to fetch tenant_access_token: ${JSON.stringify(res.data)}`)
    }
    this.tokenCache = { token, expiresAt: now + expire * 1000 }
    logger.debug({ expiresInSec: expire }, "feishu.token.refreshed")
    return token
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    opts?: { data?: unknown; params?: Record<string, unknown> },
  ): Promise<T> {
    const token = await this.getTenantAccessToken()
    const res = await this.http.request<{ code: number; msg: string; data: T }>({
      method,
      url: path,
      data: opts?.data,
      params: opts?.params,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.data.code !== 0) {
      throw new Error(`Feishu API error: ${res.data.code} ${res.data.msg} (path=${path})`)
    }
    return res.data.data
  }
}
