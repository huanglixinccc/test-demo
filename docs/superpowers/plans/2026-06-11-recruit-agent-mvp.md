# 招聘助手 Agent MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end MVP of a Feishu-based recruitment Agent covering M1 (resume parsing via bot) and M3 (interview loop via Bitable events), as defined in `docs/superpowers/specs/2026-06-11-recruit-agent-mvp-design.md`.

**Architecture:** Node.js + TypeScript + Express. Single webhook endpoint receives all Feishu events; in-process EventEmitter dispatches business events to Agents (ResumeAgent / InterviewAgent). DeepSeek used as default LLM behind an `AIProvider` interface. All persistence lives in Feishu Bitable via a `FeishuClient` adapter.

**Tech Stack:** Node 18+, TypeScript 5, Express 4, pino, vitest, node-cron, pdf-parse, p-limit, axios, dotenv. pm2 + Nginx for deployment.

---

## Phase 0 — Project bootstrap

### Task 1: Initialize project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.editorconfig`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "recruit-agent",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsc -p .",
    "start": "node dist/app.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "node-cron": "^3.0.3",
    "p-limit": "^6.1.0",
    "pdf-parse": "^1.1.1",
    "pino": "^9.5.0",
    "uuid": "^11.0.3"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.9.0",
    "@types/node-cron": "^3.0.11",
    "@types/pdf-parse": "^1.1.4",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
})
```

- [ ] **Step 4: Write `.gitignore`**

```text
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
```

- [ ] **Step 5: Write `.env.example`**

```text
# Feishu app
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_VERIFICATION_TOKEN=xxx
FEISHU_ENCRYPT_KEY=xxx

# Feishu Bitable
FEISHU_BITABLE_APP_TOKEN=xxx
FEISHU_TABLE_CANDIDATE=tblxxx
FEISHU_TABLE_REFERRAL=tblxxx
FEISHU_TABLE_INTERVIEW=tblxxx
FEISHU_TABLE_JD=tblxxx

# HR notification (comma-separated open_ids)
HR_OPEN_IDS=ou_xxx

# LLM
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# Server
PORT=3000
LOG_LEVEL=info
```

- [ ] **Step 6: Write `.editorconfig`**

```text
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: dependencies installed, `package-lock.json` created.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore .env.example .editorconfig
git commit -m "chore: scaffold node+ts project for recruit-agent"
```

---

### Task 2: Logger + config

**Files:**
- Create: `src/utils/logger.ts`
- Create: `src/config/env.ts`
- Create: `src/config/feishu.tables.ts`
- Test: `tests/config/env.test.ts`

- [ ] **Step 1: Write `src/utils/logger.ts`**

```ts
import pino from "pino"

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
})
```

- [ ] **Step 2: Write `src/config/env.ts`**

```ts
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
```

- [ ] **Step 3: Write `src/config/feishu.tables.ts`**

```ts
import { env } from "./env.js"

export const tables = env.tables
export const bitableAppToken = env.feishu.bitableAppToken
```

- [ ] **Step 4: Write `tests/config/env.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest"

describe("env loader", () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("FEISHU_") || key.startsWith("DEEPSEEK_") || key === "HR_OPEN_IDS") {
        delete process.env[key]
      }
    }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it("throws when required vars are missing", async () => {
    await expect(async () => {
      const mod = await import("../../src/config/env.js?test1")
      return mod.env
    }).rejects.toThrow(/Missing env var/)
  })

  it("parses HR_OPEN_IDS into array", async () => {
    process.env.FEISHU_APP_ID = "a"
    process.env.FEISHU_APP_SECRET = "b"
    process.env.FEISHU_VERIFICATION_TOKEN = "c"
    process.env.FEISHU_ENCRYPT_KEY = "d"
    process.env.FEISHU_BITABLE_APP_TOKEN = "e"
    process.env.FEISHU_TABLE_CANDIDATE = "f"
    process.env.FEISHU_TABLE_REFERRAL = "g"
    process.env.FEISHU_TABLE_INTERVIEW = "h"
    process.env.FEISHU_TABLE_JD = "i"
    process.env.HR_OPEN_IDS = "ou_1, ou_2 ,ou_3"
    process.env.DEEPSEEK_API_KEY = "k"
    const mod = await import("../../src/config/env.js?test2")
    expect(mod.env.hrOpenIds).toEqual(["ou_1", "ou_2", "ou_3"])
  })
})
```

> Note: the `?test1`/`?test2` query string forces vitest to re-import a fresh module instance because env loading happens at import time.

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/config/env.test.ts`
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/logger.ts src/config tests/config
git commit -m "feat: typed env loader + pino logger"
```

---

### Task 3: Express app skeleton + /health

**Files:**
- Create: `src/app.ts`
- Test: `tests/app.health.test.ts`

- [ ] **Step 1: Write `src/app.ts`**

```ts
import express from "express"
import { logger } from "./utils/logger.js"

export function createApp() {
  const app = express()
  app.use(express.json({ limit: "2mb" }))

  app.get("/health", (_req, res) => {
    res.json({ ok: true, ts: Date.now() })
  })

  return app
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const { env } = await import("./config/env.js")
  const app = createApp()
  app.listen(env.port, () => {
    logger.info({ port: env.port }, "recruit-agent listening")
  })
}
```

- [ ] **Step 2: Write `tests/app.health.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import http from "node:http"
import { createApp } from "../src/app.js"

function listenForOnce(app: ReturnType<typeof createApp>) {
  return new Promise<{ server: http.Server; port: number }>((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === "object") resolve({ server, port: addr.port })
    })
  })
}

describe("GET /health", () => {
  it("returns ok=true", async () => {
    const { server, port } = await listenForOnce(createApp())
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`)
      const body = (await res.json()) as { ok: boolean; ts: number }
      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(typeof body.ts).toBe("number")
    } finally {
      await new Promise<void>((r) => server.close(() => r()))
    }
  })
})
```

- [ ] **Step 3: Run test**

Run: `npm test -- tests/app.health.test.ts`
Expected: 1 test passes.

- [ ] **Step 4: Commit**

```bash
git add src/app.ts tests/app.health.test.ts
git commit -m "feat: express app skeleton with /health"
```

---

## Phase 1 — Adapters & infrastructure

### Task 4: AIProvider interface + DeepSeek implementation

**Files:**
- Create: `src/ai/provider.ts`
- Create: `src/ai/deepseek.ts`
- Test: `tests/ai/deepseek.test.ts`

- [ ] **Step 1: Write `src/ai/provider.ts`**

```ts
export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface AIProvider {
  chat(messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }): Promise<string>
}
```

- [ ] **Step 2: Write `src/ai/deepseek.ts`**

```ts
import axios, { AxiosInstance } from "axios"
import type { AIProvider, ChatMessage } from "./provider.js"

export interface DeepSeekConfig {
  apiKey: string
  baseUrl: string
  model: string
  client?: AxiosInstance
}

export function createDeepSeekProvider(cfg: DeepSeekConfig): AIProvider {
  const http =
    cfg.client ??
    axios.create({
      baseURL: cfg.baseUrl,
      timeout: 60_000,
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
    })

  return {
    async chat(messages: ChatMessage[], opts) {
      const res = await http.post("/chat/completions", {
        model: cfg.model,
        messages,
        temperature: opts?.temperature ?? 0.1,
        max_tokens: opts?.maxTokens ?? 1024,
        stream: false,
      })
      const content = res.data?.choices?.[0]?.message?.content
      if (typeof content !== "string") throw new Error("DeepSeek returned no content")
      return content
    },
  }
}
```

- [ ] **Step 3: Write `tests/ai/deepseek.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest"
import axios from "axios"
import { createDeepSeekProvider } from "../../src/ai/deepseek.js"

describe("DeepSeek provider", () => {
  it("posts to /chat/completions and returns content", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { choices: [{ message: { content: "hello" } }] },
    })
    const fakeClient = { post } as unknown as ReturnType<typeof axios.create>

    const provider = createDeepSeekProvider({
      apiKey: "k",
      baseUrl: "https://x",
      model: "deepseek-chat",
      client: fakeClient,
    })

    const out = await provider.chat(
      [
        { role: "system", content: "s" },
        { role: "user", content: "u" },
      ],
      { temperature: 0, maxTokens: 100 },
    )

    expect(out).toBe("hello")
    expect(post).toHaveBeenCalledWith(
      "/chat/completions",
      expect.objectContaining({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "s" },
          { role: "user", content: "u" },
        ],
        temperature: 0,
        max_tokens: 100,
        stream: false,
      }),
    )
  })

  it("throws if response has no content", async () => {
    const post = vi.fn().mockResolvedValue({ data: { choices: [] } })
    const fakeClient = { post } as unknown as ReturnType<typeof axios.create>
    const provider = createDeepSeekProvider({
      apiKey: "k", baseUrl: "https://x", model: "m", client: fakeClient,
    })
    await expect(provider.chat([{ role: "user", content: "u" }])).rejects.toThrow(/no content/)
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/ai/deepseek.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ai tests/ai
git commit -m "feat: AIProvider interface + DeepSeek implementation"
```

---

### Task 5: Event bus + types

**Files:**
- Create: `src/events/bus.ts`
- Create: `src/events/types.ts`
- Test: `tests/events/bus.test.ts`

- [ ] **Step 1: Write `src/events/types.ts`**

```ts
export interface ResumeReceivedPayload {
  text: string
  senderOpenId: string
  sourceMessageId: string
  filename?: string
}

export interface InterviewScheduledPayload {
  interviewRecordId: string
  candidateId: string
  candidateName: string
  interviewerName: string
  interviewerOpenId: string
  interviewTime: number
}

export interface ReviewSubmittedPayload {
  interviewRecordId: string
  candidateId: string
  candidateName: string
  interviewerName: string
  reviewContent: string
  reviewResult: "通过" | "待定" | "淘汰"
}

export type EventMap = {
  ResumeReceived: ResumeReceivedPayload
  InterviewScheduled: InterviewScheduledPayload
  ReviewSubmitted: ReviewSubmittedPayload
}
```

- [ ] **Step 2: Write `src/events/bus.ts`**

```ts
import { EventEmitter } from "node:events"
import type { EventMap } from "./types.js"
import { logger } from "../utils/logger.js"

class TypedBus {
  private readonly ee = new EventEmitter({ captureRejections: true })

  emit<K extends keyof EventMap>(name: K, payload: EventMap[K]): void {
    logger.debug({ event: name }, "bus.emit")
    this.ee.emit(name, payload)
  }

  on<K extends keyof EventMap>(name: K, handler: (payload: EventMap[K]) => void | Promise<void>): void {
    this.ee.on(name, async (payload) => {
      try {
        await handler(payload)
      } catch (err) {
        logger.error({ err, event: name }, "bus.handler.error")
      }
    })
  }
}

export const bus = new TypedBus()
```

- [ ] **Step 3: Write `tests/events/bus.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest"
import { bus } from "../../src/events/bus.js"

describe("event bus", () => {
  it("dispatches typed events to handlers", async () => {
    const handler = vi.fn()
    bus.on("ResumeReceived", handler)
    bus.emit("ResumeReceived", {
      text: "hi", senderOpenId: "ou_1", sourceMessageId: "om_1",
    })
    await new Promise((r) => setImmediate(r))
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ senderOpenId: "ou_1" }),
    )
  })

  it("does not throw when a handler throws", async () => {
    bus.on("InterviewScheduled", () => {
      throw new Error("boom")
    })
    expect(() =>
      bus.emit("InterviewScheduled", {
        interviewRecordId: "rec",
        candidateId: "c",
        candidateName: "n",
        interviewerName: "i",
        interviewerOpenId: "ou",
        interviewTime: Date.now(),
      }),
    ).not.toThrow()
    await new Promise((r) => setImmediate(r))
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/events/bus.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/events tests/events
git commit -m "feat: typed in-process event bus"
```

---

### Task 6: Utility modules (dedupe + pdf)

**Files:**
- Create: `src/utils/dedupe.ts`
- Create: `src/utils/pdf.ts`
- Test: `tests/utils/dedupe.test.ts`

- [ ] **Step 1: Write `src/utils/dedupe.ts`**

```ts
export class LruDedupe {
  private readonly capacity: number
  private readonly map = new Map<string, true>()

  constructor(capacity = 1000) {
    this.capacity = capacity
  }

  seen(key: string): boolean {
    if (this.map.has(key)) {
      this.map.delete(key)
      this.map.set(key, true)
      return true
    }
    this.map.set(key, true)
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
    return false
  }
}

export const eventDedupe = new LruDedupe(1000)
```

- [ ] **Step 2: Write `src/utils/pdf.ts`**

```ts
import pdfParse from "pdf-parse"

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer)
  return (result.text ?? "").trim()
}
```

- [ ] **Step 3: Write `tests/utils/dedupe.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { LruDedupe } from "../../src/utils/dedupe.js"

describe("LruDedupe", () => {
  it("returns false on first sighting, true on repeat", () => {
    const d = new LruDedupe(3)
    expect(d.seen("a")).toBe(false)
    expect(d.seen("a")).toBe(true)
  })

  it("evicts oldest beyond capacity", () => {
    const d = new LruDedupe(2)
    d.seen("a")
    d.seen("b")
    d.seen("c")
    expect(d.seen("a")).toBe(false)
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/utils/dedupe.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dedupe.ts src/utils/pdf.ts tests/utils
git commit -m "feat: LRU event dedupe + pdf text extractor"
```

---

### Task 7: FeishuClient — tenant_access_token cache

**Files:**
- Create: `src/feishu/client.ts`
- Test: `tests/feishu/client.test.ts`

- [ ] **Step 1: Write `src/feishu/client.ts`**

```ts
import axios, { AxiosInstance } from "axios"
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

  async request<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, opts?: {
    data?: unknown
    params?: Record<string, unknown>
  }): Promise<T> {
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
```

- [ ] **Step 2: Write `tests/feishu/client.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest"
import { FeishuClient } from "../../src/feishu/client.js"

function fakeHttp(handler: (config: any) => Promise<any>) {
  return { request: vi.fn(handler), post: vi.fn(handler) } as any
}

describe("FeishuClient", () => {
  it("caches the tenant_access_token until near expiry", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { tenant_access_token: "tok1", expire: 7200 },
    })
    const http = { post, request: vi.fn() } as any
    const client = new FeishuClient({ appId: "a", appSecret: "b", http })

    const t1 = await client.getTenantAccessToken()
    const t2 = await client.getTenantAccessToken()
    expect(t1).toBe("tok1")
    expect(t2).toBe("tok1")
    expect(post).toHaveBeenCalledTimes(1)
  })

  it("throws when API returns non-zero code", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { tenant_access_token: "tok1", expire: 7200 },
    })
    const request = vi.fn().mockResolvedValue({
      data: { code: 99991663, msg: "permission denied", data: null },
    })
    const http = { post, request } as any
    const client = new FeishuClient({ appId: "a", appSecret: "b", http })

    await expect(client.request("GET", "/x")).rejects.toThrow(/permission denied/)
  })

  it("returns data on success", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { tenant_access_token: "tok1", expire: 7200 },
    })
    const request = vi.fn().mockResolvedValue({
      data: { code: 0, msg: "ok", data: { hello: "world" } },
    })
    const http = { post, request } as any
    const client = new FeishuClient({ appId: "a", appSecret: "b", http })

    const out = await client.request<{ hello: string }>("GET", "/x")
    expect(out.hello).toBe("world")
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/feishu/client.test.ts`
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/feishu/client.ts tests/feishu/client.test.ts
git commit -m "feat: FeishuClient with tenant_access_token caching"
```

---

### Task 8: FeishuClient — Bitable wrapper

**Files:**
- Create: `src/feishu/bitable.ts`
- Test: `tests/feishu/bitable.test.ts`

- [ ] **Step 1: Write `src/feishu/bitable.ts`**

```ts
import type { FeishuClient } from "./client.js"

export type CandidateStatus =
  | "待筛选" | "初筛通过" | "技术面" | "HR面" | "Offer" | "入职" | "淘汰"

export type ReviewResult = "通过" | "待定" | "淘汰"

export type InterviewStatus = "待安排" | "待面试" | "待面评" | "已完成"

export interface CandidateFields {
  candidateId: string
  name: string | null
  position: string | null
  phone: string | null
  email: string | null
  skills: string[]
  resumeSource: string
  resumeUrl?: string | null
  status: CandidateStatus
  matchScore?: number | null
  priority?: "高" | "中" | "低" | null
  createdAt: number
}

export interface InterviewFields {
  interviewId?: string
  candidateId?: string
  candidateName?: string
  interviewerName?: string
  interviewerOpenId?: string
  interviewTime?: number
  interviewStatus?: InterviewStatus
  reviewContent?: string
  reviewResult?: ReviewResult
  notificationStatus?: "未通知" | "已通知" | "已提醒面评"
}

export interface BitableRecord<F> {
  record_id: string
  fields: F
}

export class BitableTables {
  constructor(
    private readonly client: FeishuClient,
    private readonly appToken: string,
    private readonly tables: { candidate: string; interview: string; referral: string; jd: string },
  ) {}

  private base(tableId: string) {
    return `/open-apis/bitable/v1/apps/${this.appToken}/tables/${tableId}`
  }

  async createCandidate(fields: CandidateFields): Promise<BitableRecord<CandidateFields>> {
    const data = await this.client.request<{ record: BitableRecord<CandidateFields> }>(
      "POST",
      `${this.base(this.tables.candidate)}/records`,
      { data: { fields } },
    )
    return data.record
  }

  async getInterview(recordId: string): Promise<BitableRecord<InterviewFields>> {
    const data = await this.client.request<{ record: BitableRecord<InterviewFields> }>(
      "GET",
      `${this.base(this.tables.interview)}/records/${recordId}`,
    )
    return data.record
  }

  async updateInterview(recordId: string, fields: Partial<InterviewFields>): Promise<void> {
    await this.client.request("PUT", `${this.base(this.tables.interview)}/records/${recordId}`, {
      data: { fields },
    })
  }

  async findCandidateByCandidateId(candidateId: string): Promise<BitableRecord<CandidateFields> | undefined> {
    const data = await this.client.request<{ items: BitableRecord<CandidateFields>[] }>(
      "POST",
      `${this.base(this.tables.candidate)}/records/search`,
      {
        data: {
          filter: {
            conjunction: "and",
            conditions: [
              { field_name: "candidateId", operator: "is", value: [candidateId] },
            ],
          },
          page_size: 1,
        },
      },
    )
    return data.items?.[0]
  }

  async updateCandidate(recordId: string, fields: Partial<CandidateFields>): Promise<void> {
    await this.client.request("PUT", `${this.base(this.tables.candidate)}/records/${recordId}`, {
      data: { fields },
    })
  }

  async listInterviewsNeedingReminder(now: number): Promise<BitableRecord<InterviewFields>[]> {
    // 简化：拉全部待面评（reviewContent 为空），过滤交给调用方
    const data = await this.client.request<{ items?: BitableRecord<InterviewFields>[] }>(
      "POST",
      `${this.base(this.tables.interview)}/records/search`,
      {
        data: {
          filter: {
            conjunction: "and",
            conditions: [
              { field_name: "interviewStatus", operator: "is", value: ["待面试"] },
            ],
          },
          page_size: 100,
        },
      },
    )
    const items = data.items ?? []
    return items.filter((r) => {
      const t = r.fields.interviewTime ?? 0
      const reviewed = (r.fields.reviewContent ?? "").length > 0
      const notified = r.fields.notificationStatus === "已提醒面评"
      return t > 0 && t + 60 * 60 * 1000 < now && !reviewed && !notified
    })
  }
}
```

- [ ] **Step 2: Write `tests/feishu/bitable.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest"
import { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuClient } from "../../src/feishu/client.js"

function fakeClient(handler: (m: string, p: string, opts?: any) => Promise<any>): FeishuClient {
  return { request: vi.fn(handler) } as unknown as FeishuClient
}

const tables = { candidate: "tCand", interview: "tIv", referral: "tRef", jd: "tJd" }

describe("BitableTables", () => {
  it("createCandidate POSTs to candidate table /records and returns record", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      return { record: { record_id: "rec_1", fields: opts.data.fields } }
    })
    const t = new BitableTables(client, "appT", tables)
    const out = await t.createCandidate({
      candidateId: "c1",
      name: "张三",
      position: "前端",
      phone: "138",
      email: null,
      skills: ["React"],
      resumeSource: "飞书机器人",
      status: "待筛选",
      createdAt: 1,
    })
    expect(out.record_id).toBe("rec_1")
    expect(calls[0].m).toBe("POST")
    expect(calls[0].p).toBe("/open-apis/bitable/v1/apps/appT/tables/tCand/records")
    expect(calls[0].opts.data.fields.name).toBe("张三")
  })

  it("listInterviewsNeedingReminder filters in-memory", async () => {
    const now = 1_000_000_000_000
    const oldEnough = now - 2 * 60 * 60 * 1000
    const tooRecent = now - 30 * 60 * 1000

    const client = fakeClient(async () => ({
      items: [
        { record_id: "r1", fields: { interviewTime: oldEnough, reviewContent: "", notificationStatus: "已通知" } },
        { record_id: "r2", fields: { interviewTime: tooRecent, reviewContent: "", notificationStatus: "已通知" } },
        { record_id: "r3", fields: { interviewTime: oldEnough, reviewContent: "hi", notificationStatus: "已通知" } },
        { record_id: "r4", fields: { interviewTime: oldEnough, reviewContent: "", notificationStatus: "已提醒面评" } },
      ],
    }))

    const t = new BitableTables(client, "appT", tables)
    const out = await t.listInterviewsNeedingReminder(now)
    expect(out.map((r) => r.record_id)).toEqual(["r1"])
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/feishu/bitable.test.ts`
Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/feishu/bitable.ts tests/feishu/bitable.test.ts
git commit -m "feat: Bitable CRUD wrappers for Candidate/Interview"
```

---

### Task 9: FeishuClient — IM (text + card)

**Files:**
- Create: `src/feishu/im.ts`
- Test: `tests/feishu/im.test.ts`

- [ ] **Step 1: Write `src/feishu/im.ts`**

```ts
import type { FeishuClient } from "./client.js"

export interface ImBinary {
  fileKey: string
  filename?: string
}

export class FeishuIM {
  constructor(private readonly client: FeishuClient) {}

  async sendTextToUser(openId: string, text: string): Promise<void> {
    await this.client.request("POST", "/open-apis/im/v1/messages", {
      params: { receive_id_type: "open_id" },
      data: {
        receive_id: openId,
        msg_type: "text",
        content: JSON.stringify({ text }),
      },
    })
  }

  async sendCardToUser(openId: string, card: unknown): Promise<void> {
    await this.client.request("POST", "/open-apis/im/v1/messages", {
      params: { receive_id_type: "open_id" },
      data: {
        receive_id: openId,
        msg_type: "interactive",
        content: JSON.stringify(card),
      },
    })
  }

  async downloadMessageFile(messageId: string, fileKey: string): Promise<Buffer> {
    // 飞书 IM 资源下载需要原始二进制
    const token = await this.client.getTenantAccessToken()
    const path = `/open-apis/im/v1/messages/${messageId}/resources/${fileKey}`
    const res = await this.client.http.request<ArrayBuffer>({
      method: "GET",
      url: path,
      params: { type: "file" },
      headers: { Authorization: `Bearer ${token}` },
      responseType: "arraybuffer",
    })
    return Buffer.from(res.data)
  }
}
```

- [ ] **Step 2: Write `tests/feishu/im.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest"
import { FeishuIM } from "../../src/feishu/im.js"
import type { FeishuClient } from "../../src/feishu/client.js"

function fakeClient(handler: (m: string, p: string, opts?: any) => Promise<any>): FeishuClient {
  return {
    request: vi.fn(handler),
    getTenantAccessToken: vi.fn().mockResolvedValue("tok"),
    http: { request: vi.fn().mockResolvedValue({ data: new ArrayBuffer(4) }) },
  } as unknown as FeishuClient
}

describe("FeishuIM", () => {
  it("sendTextToUser uses open_id and text msg_type", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      return {}
    })
    const im = new FeishuIM(client)
    await im.sendTextToUser("ou_x", "hello")
    expect(calls[0].m).toBe("POST")
    expect(calls[0].p).toBe("/open-apis/im/v1/messages")
    expect(calls[0].opts.params).toEqual({ receive_id_type: "open_id" })
    const data = calls[0].opts.data
    expect(data.receive_id).toBe("ou_x")
    expect(data.msg_type).toBe("text")
    expect(JSON.parse(data.content)).toEqual({ text: "hello" })
  })

  it("sendCardToUser serializes card object as content", async () => {
    const calls: any[] = []
    const client = fakeClient(async (m, p, opts) => {
      calls.push({ m, p, opts })
      return {}
    })
    const im = new FeishuIM(client)
    await im.sendCardToUser("ou_x", { elements: [] })
    expect(calls[0].opts.data.msg_type).toBe("interactive")
    expect(JSON.parse(calls[0].opts.data.content)).toEqual({ elements: [] })
  })

  it("downloadMessageFile returns Buffer", async () => {
    const client = fakeClient(async () => ({}))
    const im = new FeishuIM(client)
    const buf = await im.downloadMessageFile("om_1", "file_key_1")
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.length).toBe(4)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/feishu/im.test.ts`
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/feishu/im.ts tests/feishu/im.test.ts
git commit -m "feat: Feishu IM wrapper (text/card/download)"
```

---

## Phase 2 — Webhook foundation

### Task 10: Webhook verify (URL challenge + AES decrypt + signature)

**Files:**
- Create: `src/webhook/verify.ts`
- Test: `tests/webhook/verify.test.ts`

- [ ] **Step 1: Write `src/webhook/verify.ts`**

```ts
import crypto from "node:crypto"

export interface DecryptedEnvelope {
  schema?: string
  header: {
    event_id: string
    event_type: string
    create_time: string
    token: string
    app_id: string
    tenant_key: string
  }
  event: unknown
}

export interface UrlChallengeResponse {
  challenge: string
}

export interface VerifyContext {
  encryptKey: string
  verificationToken: string
}

function deriveAesKey(encryptKey: string): Buffer {
  return crypto.createHash("sha256").update(encryptKey, "utf8").digest()
}

export function aesDecrypt(encrypted: string, encryptKey: string): unknown {
  const buf = Buffer.from(encrypted, "base64")
  const iv = buf.subarray(0, 16)
  const data = buf.subarray(16)
  const key = deriveAesKey(encryptKey)
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
  const plain = Buffer.concat([decipher.update(data), decipher.final()])
  return JSON.parse(plain.toString("utf8"))
}

export function verifySignature(opts: {
  timestamp: string
  nonce: string
  body: string
  signature: string
  encryptKey: string
}): boolean {
  const raw = opts.timestamp + opts.nonce + opts.encryptKey + opts.body
  const hash = crypto.createHash("sha256").update(raw, "utf8").digest("hex")
  return hash === opts.signature
}

export type VerifyResult =
  | { kind: "url_challenge"; response: UrlChallengeResponse }
  | { kind: "event"; envelope: DecryptedEnvelope }
  | { kind: "invalid"; reason: string }

export function processIncoming(
  raw: { encrypt?: string; challenge?: string; type?: string; token?: string; [k: string]: unknown },
  headers: { timestamp?: string; nonce?: string; signature?: string; rawBody?: string },
  ctx: VerifyContext,
): VerifyResult {
  let payload: any = raw

  if (typeof raw.encrypt === "string") {
    if (headers.timestamp && headers.nonce && headers.signature && headers.rawBody) {
      const ok = verifySignature({
        timestamp: headers.timestamp,
        nonce: headers.nonce,
        body: headers.rawBody,
        signature: headers.signature,
        encryptKey: ctx.encryptKey,
      })
      if (!ok) return { kind: "invalid", reason: "bad_signature" }
    }
    try {
      payload = aesDecrypt(raw.encrypt, ctx.encryptKey)
    } catch (err) {
      return { kind: "invalid", reason: "decrypt_failed" }
    }
  }

  if (payload?.type === "url_verification") {
    if (payload.token !== ctx.verificationToken) {
      return { kind: "invalid", reason: "bad_verification_token" }
    }
    return { kind: "url_challenge", response: { challenge: payload.challenge } }
  }

  if (payload?.header?.token && payload.header.token !== ctx.verificationToken) {
    return { kind: "invalid", reason: "bad_event_token" }
  }
  if (!payload?.header?.event_type) {
    return { kind: "invalid", reason: "no_event_type" }
  }
  return { kind: "event", envelope: payload as DecryptedEnvelope }
}
```

- [ ] **Step 2: Write `tests/webhook/verify.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import crypto from "node:crypto"
import { aesDecrypt, processIncoming, verifySignature } from "../../src/webhook/verify.js"

function aesEncrypt(plaintext: string, encryptKey: string): string {
  const key = crypto.createHash("sha256").update(encryptKey, "utf8").digest()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return Buffer.concat([iv, enc]).toString("base64")
}

describe("webhook verify", () => {
  const encryptKey = "test-encrypt-key"
  const verificationToken = "test-token"

  it("decrypts AES-256-CBC payload", () => {
    const enc = aesEncrypt(JSON.stringify({ hello: "world" }), encryptKey)
    const out = aesDecrypt(enc, encryptKey)
    expect(out).toEqual({ hello: "world" })
  })

  it("verifies signature", () => {
    const body = '{"encrypt":"abc"}'
    const ts = "1700000000"
    const nonce = "n1"
    const sig = crypto.createHash("sha256").update(ts + nonce + encryptKey + body).digest("hex")
    expect(verifySignature({ timestamp: ts, nonce, body, signature: sig, encryptKey })).toBe(true)
    expect(verifySignature({ timestamp: ts, nonce, body, signature: "bad", encryptKey })).toBe(false)
  })

  it("handles url_verification challenge", () => {
    const plaintext = JSON.stringify({ type: "url_verification", token: verificationToken, challenge: "ch_1" })
    const enc = aesEncrypt(plaintext, encryptKey)
    const result = processIncoming(
      { encrypt: enc },
      { rawBody: JSON.stringify({ encrypt: enc }) },
      { encryptKey, verificationToken },
    )
    expect(result.kind).toBe("url_challenge")
    if (result.kind === "url_challenge") expect(result.response.challenge).toBe("ch_1")
  })

  it("returns event envelope for normal event", () => {
    const event = {
      schema: "2.0",
      header: { event_id: "e1", event_type: "im.message.receive_v1", create_time: "x", token: verificationToken, app_id: "a", tenant_key: "t" },
      event: { foo: 1 },
    }
    const enc = aesEncrypt(JSON.stringify(event), encryptKey)
    const result = processIncoming({ encrypt: enc }, {}, { encryptKey, verificationToken })
    expect(result.kind).toBe("event")
    if (result.kind === "event") {
      expect(result.envelope.header.event_type).toBe("im.message.receive_v1")
    }
  })

  it("rejects mismatched verification token", () => {
    const plaintext = JSON.stringify({ type: "url_verification", token: "wrong", challenge: "ch" })
    const enc = aesEncrypt(plaintext, encryptKey)
    const result = processIncoming({ encrypt: enc }, {}, { encryptKey, verificationToken })
    expect(result.kind).toBe("invalid")
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/webhook/verify.test.ts`
Expected: 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/webhook/verify.ts tests/webhook/verify.test.ts
git commit -m "feat: webhook verify (URL challenge + AES + signature)"
```

---

### Task 11: Webhook router + dispatcher

**Files:**
- Create: `src/webhook/dispatcher.ts`
- Create: `src/webhook/router.ts`
- Test: `tests/webhook/router.test.ts`

- [ ] **Step 1: Write `src/webhook/dispatcher.ts`**

```ts
import type { DecryptedEnvelope } from "./verify.js"
import { logger } from "../utils/logger.js"
import { eventDedupe } from "../utils/dedupe.js"

export type EnvelopeHandler = (envelope: DecryptedEnvelope) => Promise<void> | void

export class FeishuEventDispatcher {
  private readonly handlers = new Map<string, EnvelopeHandler>()

  register(eventType: string, handler: EnvelopeHandler): void {
    this.handlers.set(eventType, handler)
  }

  async dispatch(envelope: DecryptedEnvelope): Promise<void> {
    const eventId = envelope.header.event_id
    if (eventDedupe.seen(eventId)) {
      logger.info({ eventId }, "dispatcher.dedupe.skip")
      return
    }
    const handler = this.handlers.get(envelope.header.event_type)
    if (!handler) {
      logger.warn({ eventType: envelope.header.event_type }, "dispatcher.no_handler")
      return
    }
    try {
      await handler(envelope)
    } catch (err) {
      logger.error({ err, eventType: envelope.header.event_type }, "dispatcher.handler_error")
    }
  }
}
```

- [ ] **Step 2: Write `src/webhook/router.ts`**

```ts
import { Router, type Request, type Response } from "express"
import { processIncoming } from "./verify.js"
import type { FeishuEventDispatcher } from "./dispatcher.js"
import { logger } from "../utils/logger.js"

export function createWebhookRouter(opts: {
  encryptKey: string
  verificationToken: string
  dispatcher: FeishuEventDispatcher
}) {
  const router = Router()

  router.post("/feishu", async (req: Request, res: Response) => {
    const result = processIncoming(req.body, {
      timestamp: req.header("X-Lark-Request-Timestamp") ?? undefined,
      nonce: req.header("X-Lark-Request-Nonce") ?? undefined,
      signature: req.header("X-Lark-Signature") ?? undefined,
      rawBody: JSON.stringify(req.body),
    }, opts)

    if (result.kind === "url_challenge") {
      res.json(result.response)
      return
    }
    if (result.kind === "invalid") {
      logger.warn({ reason: result.reason }, "webhook.invalid")
      res.status(400).json({ ok: false, reason: result.reason })
      return
    }

    res.json({ ok: true })
    setImmediate(() => opts.dispatcher.dispatch(result.envelope))
  })

  return router
}
```

- [ ] **Step 3: Write `tests/webhook/router.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest"
import express from "express"
import crypto from "node:crypto"
import http from "node:http"
import { createWebhookRouter } from "../../src/webhook/router.js"
import { FeishuEventDispatcher } from "../../src/webhook/dispatcher.js"

function aesEncrypt(plaintext: string, encryptKey: string): string {
  const key = crypto.createHash("sha256").update(encryptKey, "utf8").digest()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return Buffer.concat([iv, enc]).toString("base64")
}

async function start(): Promise<{ port: number; server: http.Server; dispatcher: FeishuEventDispatcher }> {
  const encryptKey = "k"
  const verificationToken = "t"
  const dispatcher = new FeishuEventDispatcher()
  const app = express()
  app.use(express.json())
  app.use("/webhook", createWebhookRouter({ encryptKey, verificationToken, dispatcher }))
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === "object") resolve({ port: addr.port, server, dispatcher })
    })
  })
}

describe("webhook router", () => {
  it("returns challenge for url_verification", async () => {
    const { server, port } = await start()
    try {
      const enc = aesEncrypt(JSON.stringify({ type: "url_verification", token: "t", challenge: "ch" }), "k")
      const res = await fetch(`http://127.0.0.1:${port}/webhook/feishu`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ encrypt: enc }),
      })
      const body = (await res.json()) as { challenge: string }
      expect(body.challenge).toBe("ch")
    } finally {
      await new Promise<void>((r) => server.close(() => r()))
    }
  })

  it("dispatches event and returns ok", async () => {
    const { server, port, dispatcher } = await start()
    const handler = vi.fn()
    dispatcher.register("im.message.receive_v1", handler)
    try {
      const envelope = {
        schema: "2.0",
        header: { event_id: "e_router_1", event_type: "im.message.receive_v1", create_time: "x", token: "t", app_id: "a", tenant_key: "t" },
        event: { foo: 1 },
      }
      const enc = aesEncrypt(JSON.stringify(envelope), "k")
      const res = await fetch(`http://127.0.0.1:${port}/webhook/feishu`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ encrypt: enc }),
      })
      const body = (await res.json()) as { ok: boolean }
      expect(body.ok).toBe(true)
      await new Promise((r) => setTimeout(r, 50))
      expect(handler).toHaveBeenCalledTimes(1)
    } finally {
      await new Promise<void>((r) => server.close(() => r()))
    }
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/webhook/router.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/webhook tests/webhook/router.test.ts
git commit -m "feat: webhook router + event dispatcher"
```

---

## Phase 3 — M1 resume vertical

### Task 12: Bot message handler

**Files:**
- Create: `src/feishu/events/botMessage.ts`
- Test: `tests/feishu/events.botMessage.test.ts`

- [ ] **Step 1: Write `src/feishu/events/botMessage.ts`**

```ts
import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { FeishuIM } from "../im.js"
import { bus } from "../../events/bus.js"
import { logger } from "../../utils/logger.js"
import { extractTextFromPdf } from "../../utils/pdf.js"

interface ImMessageEvent {
  sender: { sender_id: { open_id: string } }
  message: {
    message_id: string
    chat_type: "p2p" | "group"
    message_type: "text" | "file" | "post" | string
    content: string
  }
}

export function makeBotMessageHandler(im: FeishuIM) {
  return async function handle(envelope: DecryptedEnvelope): Promise<void> {
    const ev = envelope.event as ImMessageEvent
    if (ev?.message?.chat_type !== "p2p") return
    const senderOpenId = ev.sender?.sender_id?.open_id
    if (!senderOpenId) return

    if (ev.message.message_type === "text") {
      const text = safeParseText(ev.message.content)
      if (!text) return
      await im.sendTextToUser(senderOpenId, "已收到，正在解析…")
      bus.emit("ResumeReceived", { text, senderOpenId, sourceMessageId: ev.message.message_id })
      return
    }

    if (ev.message.message_type === "file") {
      const fileMeta = safeParseFile(ev.message.content)
      if (!fileMeta?.file_key) {
        await im.sendTextToUser(senderOpenId, "未能识别该文件")
        return
      }
      await im.sendTextToUser(senderOpenId, "已收到文件，正在提取文本…")
      try {
        const buf = await im.downloadMessageFile(ev.message.message_id, fileMeta.file_key)
        const text = await extractText(buf, fileMeta.file_name ?? "")
        if (!text) {
          await im.sendTextToUser(senderOpenId, "文件中没有提取到文字（可能是扫描件）。请粘贴简历文本。")
          return
        }
        bus.emit("ResumeReceived", {
          text,
          senderOpenId,
          sourceMessageId: ev.message.message_id,
          filename: fileMeta.file_name,
        })
      } catch (err) {
        logger.error({ err }, "botMessage.file.extract_failed")
        await im.sendTextToUser(senderOpenId, "文件提取失败，请改用文本粘贴")
      }
      return
    }

    logger.info({ type: ev.message.message_type }, "botMessage.unsupported_type")
  }
}

function safeParseText(content: string): string | undefined {
  try {
    const parsed = JSON.parse(content) as { text?: string }
    if (typeof parsed.text === "string") return parsed.text.trim()
  } catch {}
  return undefined
}

function safeParseFile(content: string): { file_key?: string; file_name?: string } | undefined {
  try {
    return JSON.parse(content)
  } catch {
    return undefined
  }
}

async function extractText(buf: Buffer, filename: string): Promise<string> {
  if (filename.toLowerCase().endsWith(".pdf")) {
    return extractTextFromPdf(buf)
  }
  // TXT / unknown → treat as utf-8
  return buf.toString("utf8").trim()
}
```

- [ ] **Step 2: Write `tests/feishu/events.botMessage.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeBotMessageHandler } from "../../src/feishu/events/botMessage.js"
import { bus } from "../../src/events/bus.js"
import type { FeishuIM } from "../../src/feishu/im.js"

function envelope(event: unknown) {
  return {
    schema: "2.0",
    header: { event_id: "e1", event_type: "im.message.receive_v1", create_time: "x", token: "t", app_id: "a", tenant_key: "t" },
    event,
  }
}

function fakeIm(): FeishuIM {
  return {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    downloadMessageFile: vi.fn().mockResolvedValue(Buffer.from("张三 138 react", "utf8")),
  } as unknown as FeishuIM
}

describe("bot message handler", () => {
  beforeEach(() => {
    bus["ee"].removeAllListeners()
  })

  it("emits ResumeReceived on p2p text", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)
    const got = vi.fn()
    bus.on("ResumeReceived", got)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: { message_id: "om_1", chat_type: "p2p", message_type: "text", content: JSON.stringify({ text: "  张三  " }) },
    }))

    await new Promise((r) => setImmediate(r))
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_1", "已收到，正在解析…")
    expect(got).toHaveBeenCalledWith(expect.objectContaining({ text: "张三", senderOpenId: "ou_1" }))
  })

  it("ignores group messages", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)
    const got = vi.fn()
    bus.on("ResumeReceived", got)
    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: { message_id: "om_1", chat_type: "group", message_type: "text", content: JSON.stringify({ text: "hi" }) },
    }))
    await new Promise((r) => setImmediate(r))
    expect(got).not.toHaveBeenCalled()
  })

  it("downloads and emits for TXT file", async () => {
    const im = fakeIm()
    const handler = makeBotMessageHandler(im)
    const got = vi.fn()
    bus.on("ResumeReceived", got)

    await handler(envelope({
      sender: { sender_id: { open_id: "ou_1" } },
      message: {
        message_id: "om_2",
        chat_type: "p2p",
        message_type: "file",
        content: JSON.stringify({ file_key: "fk_1", file_name: "resume.txt" }),
      },
    }))

    await new Promise((r) => setImmediate(r))
    expect(im.downloadMessageFile).toHaveBeenCalledWith("om_2", "fk_1")
    expect(got).toHaveBeenCalledWith(expect.objectContaining({ filename: "resume.txt" }))
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/feishu/events.botMessage.test.ts`
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/feishu/events/botMessage.ts tests/feishu/events.botMessage.test.ts
git commit -m "feat: bot message handler (text/file → ResumeReceived)"
```

---

### Task 13: Resume parser + prompt

**Files:**
- Create: `src/agents/resume/prompts.ts`
- Create: `src/agents/resume/parse.ts`
- Test: `tests/agents/resume.parse.test.ts`

- [ ] **Step 1: Write `src/agents/resume/prompts.ts`**

```ts
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
```

- [ ] **Step 2: Write `src/agents/resume/parse.ts`**

```ts
import type { AIProvider } from "../../ai/provider.js"
import { RESUME_SYSTEM_PROMPT, buildResumeUserPrompt } from "./prompts.js"

export interface ParsedResume {
  name: string | null
  phone: string | null
  email: string | null
  position: string | null
  yearsOfExperience: number | null
  skills: string[]
}

export async function parseResume(ai: AIProvider, text: string): Promise<ParsedResume> {
  const raw = await ai.chat([
    { role: "system", content: RESUME_SYSTEM_PROMPT },
    { role: "user", content: buildResumeUserPrompt(text) },
  ], { temperature: 0.1, maxTokens: 800 })

  const parsed = extractJson(raw)
  return normalize(parsed)
}

function extractJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed)
  } catch {}
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`LLM did not return JSON. raw=${trimmed.slice(0, 200)}`)
  return JSON.parse(match[0])
}

function normalize(o: Record<string, unknown>): ParsedResume {
  const skills = Array.isArray(o.skills)
    ? (o.skills as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 8)
    : []
  return {
    name: stringOrNull(o.name),
    phone: stringOrNull(o.phone),
    email: stringOrNull(o.email),
    position: stringOrNull(o.position),
    yearsOfExperience: typeof o.yearsOfExperience === "number" ? o.yearsOfExperience : null,
    skills,
  }
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null
}

export function hasAnyKeyField(p: ParsedResume): boolean {
  return Boolean(p.name || p.phone || p.email)
}
```

- [ ] **Step 3: Write `tests/agents/resume.parse.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest"
import { parseResume, hasAnyKeyField } from "../../src/agents/resume/parse.js"
import type { AIProvider } from "../../src/ai/provider.js"

function aiReturning(content: string): AIProvider {
  return { chat: vi.fn().mockResolvedValue(content) }
}

describe("parseResume", () => {
  it("parses clean JSON output", async () => {
    const ai = aiReturning(`{"name":"张三","phone":"138","email":"a@b.com","position":"前端","yearsOfExperience":3,"skills":["React","TypeScript"]}`)
    const out = await parseResume(ai, "...")
    expect(out.name).toBe("张三")
    expect(out.skills).toEqual(["React", "TypeScript"])
  })

  it("extracts JSON from surrounding text", async () => {
    const ai = aiReturning(`Sure, here it is:\n{"name":"李四","phone":null,"email":"x@y.com","position":null,"yearsOfExperience":null,"skills":[]}\n`)
    const out = await parseResume(ai, "...")
    expect(out.name).toBe("李四")
    expect(out.position).toBe(null)
  })

  it("caps skills at 8", async () => {
    const skills = Array.from({ length: 20 }, (_, i) => `s${i}`)
    const ai = aiReturning(JSON.stringify({ name: null, phone: null, email: null, position: null, yearsOfExperience: null, skills }))
    const out = await parseResume(ai, "...")
    expect(out.skills).toHaveLength(8)
  })

  it("throws on non-JSON content", async () => {
    const ai = aiReturning("no json here")
    await expect(parseResume(ai, "...")).rejects.toThrow(/did not return JSON/)
  })

  it("hasAnyKeyField requires at least one of name/phone/email", () => {
    expect(hasAnyKeyField({ name: null, phone: null, email: null, position: null, yearsOfExperience: null, skills: [] })).toBe(false)
    expect(hasAnyKeyField({ name: "x", phone: null, email: null, position: null, yearsOfExperience: null, skills: [] })).toBe(true)
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/agents/resume.parse.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/agents/resume tests/agents/resume.parse.test.ts
git commit -m "feat: resume LLM prompt + parser with JSON normalization"
```

---

### Task 14: ResumeAgent (subscribe + write Bitable + reply)

**Files:**
- Create: `src/agents/resume/index.ts`
- Test: `tests/agents/resume.index.test.ts`

- [ ] **Step 1: Write `src/agents/resume/index.ts`**

```ts
import { v4 as uuid } from "uuid"
import type { AIProvider } from "../../ai/provider.js"
import type { BitableTables } from "../../feishu/bitable.js"
import type { FeishuIM } from "../../feishu/im.js"
import { bus } from "../../events/bus.js"
import { parseResume, hasAnyKeyField } from "./parse.js"
import { logger } from "../../utils/logger.js"

export interface ResumeAgentDeps {
  ai: AIProvider
  bitable: BitableTables
  im: FeishuIM
}

export function registerResumeAgent(deps: ResumeAgentDeps): void {
  bus.on("ResumeReceived", async (payload) => {
    let parsed
    try {
      parsed = await parseResume(deps.ai, payload.text)
    } catch (err) {
      logger.error({ err }, "resumeAgent.parse_failed")
      await deps.im.sendTextToUser(payload.senderOpenId, "解析失败，请粘贴更完整的简历文本或换一份")
      return
    }

    if (!hasAnyKeyField(parsed)) {
      await deps.im.sendTextToUser(payload.senderOpenId, "未识别到候选人姓名/联系方式，请检查内容")
      return
    }

    const candidateId = uuid()
    try {
      await deps.bitable.createCandidate({
        candidateId,
        name: parsed.name,
        position: parsed.position,
        phone: parsed.phone,
        email: parsed.email,
        skills: parsed.skills,
        resumeSource: "飞书机器人",
        status: "待筛选",
        createdAt: Date.now(),
      })
    } catch (err) {
      logger.error({ err }, "resumeAgent.bitable_failed")
      await deps.im.sendTextToUser(payload.senderOpenId, "写入失败，请联系管理员")
      return
    }

    const card = buildResumeReplyCard({ candidateId, parsed })
    try {
      await deps.im.sendCardToUser(payload.senderOpenId, card)
    } catch {
      await deps.im.sendTextToUser(payload.senderOpenId, `已写入候选人库：${parsed.name ?? "(无名)"} / ${parsed.position ?? "(未填岗位)"}`)
    }
  })
}

export function buildResumeReplyCard(opts: { candidateId: string; parsed: Awaited<ReturnType<typeof parseResume>> }) {
  const { parsed } = opts
  return {
    config: { wide_screen_mode: true },
    header: { template: "green", title: { tag: "plain_text", content: "候选人已入库" } },
    elements: [
      {
        tag: "div",
        fields: [
          { is_short: true, text: { tag: "lark_md", content: `**姓名**\n${parsed.name ?? "-"}` } },
          { is_short: true, text: { tag: "lark_md", content: `**岗位**\n${parsed.position ?? "-"}` } },
          { is_short: true, text: { tag: "lark_md", content: `**手机**\n${parsed.phone ?? "-"}` } },
          { is_short: true, text: { tag: "lark_md", content: `**邮箱**\n${parsed.email ?? "-"}` } },
          { is_short: false, text: { tag: "lark_md", content: `**技能**\n${parsed.skills.length ? parsed.skills.join("、") : "-"}` } },
          { is_short: false, text: { tag: "lark_md", content: `**候选人 ID**\n${opts.candidateId}` } },
        ],
      },
    ],
  }
}
```

- [ ] **Step 2: Write `tests/agents/resume.index.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { registerResumeAgent } from "../../src/agents/resume/index.js"
import { bus } from "../../src/events/bus.js"
import type { AIProvider } from "../../src/ai/provider.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuIM } from "../../src/feishu/im.js"

function deps(overrides: Partial<{
  aiContent: string
  createOk: boolean
}> = {}) {
  const ai = { chat: vi.fn().mockResolvedValue(overrides.aiContent ?? `{"name":"张三","phone":"138","email":"a@b.com","position":"前端","yearsOfExperience":3,"skills":["React"]}`) }
  const createCandidate = overrides.createOk === false
    ? vi.fn().mockRejectedValue(new Error("boom"))
    : vi.fn().mockResolvedValue({ record_id: "rec_1", fields: {} })
  const bitable = { createCandidate } as unknown as BitableTables
  const im = {
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as FeishuIM
  return { ai, bitable, im, createCandidate }
}

describe("ResumeAgent", () => {
  beforeEach(() => {
    bus["ee"].removeAllListeners()
  })

  it("writes candidate to Bitable and replies with card on happy path", async () => {
    const { ai, bitable, im, createCandidate } = deps()
    registerResumeAgent({ ai, bitable, im })

    bus.emit("ResumeReceived", { text: "...", senderOpenId: "ou_1", sourceMessageId: "om_1" })
    await new Promise((r) => setTimeout(r, 10))

    expect(createCandidate).toHaveBeenCalledTimes(1)
    const call = createCandidate.mock.calls[0][0]
    expect(call.name).toBe("张三")
    expect(call.skills).toEqual(["React"])
    expect(call.status).toBe("待筛选")
    expect(im.sendCardToUser).toHaveBeenCalled()
  })

  it("notifies user when LLM returns no key fields", async () => {
    const { ai, bitable, im, createCandidate } = deps({
      aiContent: `{"name":null,"phone":null,"email":null,"position":null,"yearsOfExperience":null,"skills":[]}`,
    })
    registerResumeAgent({ ai, bitable, im })

    bus.emit("ResumeReceived", { text: "...", senderOpenId: "ou_1", sourceMessageId: "om_1" })
    await new Promise((r) => setTimeout(r, 10))

    expect(createCandidate).not.toHaveBeenCalled()
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_1", expect.stringContaining("未识别到"))
  })

  it("notifies user on Bitable failure", async () => {
    const { ai, bitable, im } = deps({ createOk: false })
    registerResumeAgent({ ai, bitable, im })

    bus.emit("ResumeReceived", { text: "...", senderOpenId: "ou_1", sourceMessageId: "om_1" })
    await new Promise((r) => setTimeout(r, 10))

    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_1", expect.stringContaining("写入失败"))
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/agents/resume.index.test.ts`
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/agents/resume/index.ts tests/agents/resume.index.test.ts
git commit -m "feat: ResumeAgent (parse + write Bitable + reply card)"
```

---

## Phase 4 — M3 interview vertical

### Task 15: Interview state machine (pure function)

**Files:**
- Create: `src/agents/interview/stateMachine.ts`
- Test: `tests/agents/interview.stateMachine.test.ts`

- [ ] **Step 1: Write `src/agents/interview/stateMachine.ts`**

```ts
import type { CandidateStatus, ReviewResult } from "../../feishu/bitable.js"

export function nextCandidateStatus(current: CandidateStatus, review: ReviewResult): CandidateStatus {
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
```

- [ ] **Step 2: Write `tests/agents/interview.stateMachine.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { nextCandidateStatus } from "../../src/agents/interview/stateMachine.js"

describe("nextCandidateStatus", () => {
  it("淘汰 → 淘汰 regardless of current", () => {
    expect(nextCandidateStatus("待筛选", "淘汰")).toBe("淘汰")
    expect(nextCandidateStatus("HR面", "淘汰")).toBe("淘汰")
  })

  it("待定 keeps current status", () => {
    expect(nextCandidateStatus("技术面", "待定")).toBe("技术面")
    expect(nextCandidateStatus("Offer", "待定")).toBe("Offer")
  })

  it("通过 from 待筛选/初筛通过 → 技术面", () => {
    expect(nextCandidateStatus("待筛选", "通过")).toBe("技术面")
    expect(nextCandidateStatus("初筛通过", "通过")).toBe("技术面")
  })

  it("通过 from 技术面 → HR面", () => {
    expect(nextCandidateStatus("技术面", "通过")).toBe("HR面")
  })

  it("通过 from HR面 → Offer", () => {
    expect(nextCandidateStatus("HR面", "通过")).toBe("Offer")
  })

  it("terminal states stay put on 通过", () => {
    expect(nextCandidateStatus("Offer", "通过")).toBe("Offer")
    expect(nextCandidateStatus("入职", "通过")).toBe("入职")
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/agents/interview.stateMachine.test.ts`
Expected: 6 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/agents/interview/stateMachine.ts tests/agents/interview.stateMachine.test.ts
git commit -m "feat: candidate status state machine"
```

---

### Task 16: Bitable change event handler

**Files:**
- Create: `src/feishu/events/bitableChange.ts`
- Test: `tests/feishu/events.bitableChange.test.ts`

- [ ] **Step 1: Write `src/feishu/events/bitableChange.ts`**

```ts
import type { DecryptedEnvelope } from "../../webhook/verify.js"
import type { BitableTables, InterviewFields } from "../bitable.js"
import { bus } from "../../events/bus.js"
import { logger } from "../../utils/logger.js"

interface BitableChangeEvent {
  file_token: string
  table_id: string
  action_list?: Array<{ record_id: string }>
  record_id?: string
}

export function makeBitableChangeHandler(opts: {
  bitable: BitableTables
  interviewTableId: string
}) {
  return async function handle(envelope: DecryptedEnvelope): Promise<void> {
    const ev = envelope.event as BitableChangeEvent
    if (ev.table_id !== opts.interviewTableId) {
      logger.debug({ tableId: ev.table_id }, "bitableChange.skip.other_table")
      return
    }

    const recordIds = ev.action_list?.map((a) => a.record_id) ?? (ev.record_id ? [ev.record_id] : [])
    for (const recordId of recordIds) {
      let record
      try {
        record = await opts.bitable.getInterview(recordId)
      } catch (err) {
        logger.error({ err, recordId }, "bitableChange.get_failed")
        continue
      }
      dispatchInterview(record.record_id, record.fields)
    }
  }
}

export function dispatchInterview(recordId: string, fields: InterviewFields): void {
  const interviewerOpenId = fields.interviewerOpenId
  const interviewTime = fields.interviewTime
  const status = fields.interviewStatus
  const notificationStatus = fields.notificationStatus

  if (status === "待安排" && interviewerOpenId && interviewTime && notificationStatus !== "已通知" && notificationStatus !== "已提醒面评") {
    bus.emit("InterviewScheduled", {
      interviewRecordId: recordId,
      candidateId: fields.candidateId ?? "",
      candidateName: fields.candidateName ?? "",
      interviewerName: fields.interviewerName ?? "",
      interviewerOpenId,
      interviewTime,
    })
    return
  }

  if (fields.reviewResult && status !== "已完成") {
    bus.emit("ReviewSubmitted", {
      interviewRecordId: recordId,
      candidateId: fields.candidateId ?? "",
      candidateName: fields.candidateName ?? "",
      interviewerName: fields.interviewerName ?? "",
      reviewContent: fields.reviewContent ?? "",
      reviewResult: fields.reviewResult,
    })
    return
  }

  logger.debug({ recordId, status }, "bitableChange.no_dispatch")
}
```

- [ ] **Step 2: Write `tests/feishu/events.bitableChange.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { makeBitableChangeHandler } from "../../src/feishu/events/bitableChange.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import { bus } from "../../src/events/bus.js"

function envelope(event: unknown) {
  return {
    schema: "2.0",
    header: { event_id: "ev_bc_1", event_type: "drive.file.bitable_record_changed", create_time: "x", token: "t", app_id: "a", tenant_key: "t" },
    event,
  }
}

describe("bitable change handler", () => {
  const interviewTableId = "tIv"

  beforeEach(() => {
    bus["ee"].removeAllListeners()
  })

  it("emits InterviewScheduled when row is 待安排 with interviewer + time", async () => {
    const bitable = {
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec1",
        fields: {
          candidateId: "c1", candidateName: "张三",
          interviewerName: "李四", interviewerOpenId: "ou_int",
          interviewTime: 1_700_000_000_000,
          interviewStatus: "待安排", notificationStatus: "未通知",
        },
      }),
    } as unknown as BitableTables
    const handler = makeBitableChangeHandler({ bitable, interviewTableId })
    const got = vi.fn()
    bus.on("InterviewScheduled", got)

    await handler(envelope({ table_id: interviewTableId, action_list: [{ record_id: "rec1" }] }))
    await new Promise((r) => setImmediate(r))

    expect(got).toHaveBeenCalledWith(expect.objectContaining({ interviewerOpenId: "ou_int" }))
  })

  it("emits ReviewSubmitted when reviewResult is set and status not 已完成", async () => {
    const bitable = {
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec2",
        fields: {
          candidateId: "c1", candidateName: "张三",
          reviewContent: "ok", reviewResult: "通过",
          interviewStatus: "待面评",
        },
      }),
    } as unknown as BitableTables
    const handler = makeBitableChangeHandler({ bitable, interviewTableId })
    const got = vi.fn()
    bus.on("ReviewSubmitted", got)

    await handler(envelope({ table_id: interviewTableId, action_list: [{ record_id: "rec2" }] }))
    await new Promise((r) => setImmediate(r))

    expect(got).toHaveBeenCalledWith(expect.objectContaining({ reviewResult: "通过" }))
  })

  it("ignores events for other tables", async () => {
    const bitable = { getInterview: vi.fn() } as unknown as BitableTables
    const handler = makeBitableChangeHandler({ bitable, interviewTableId })
    const got = vi.fn()
    bus.on("InterviewScheduled", got)
    bus.on("ReviewSubmitted", got)

    await handler(envelope({ table_id: "tOther", action_list: [{ record_id: "x" }] }))
    expect(bitable.getInterview).not.toHaveBeenCalled()
    expect(got).not.toHaveBeenCalled()
  })

  it("does not re-emit InterviewScheduled if already 已通知", async () => {
    const bitable = {
      getInterview: vi.fn().mockResolvedValue({
        record_id: "rec3",
        fields: {
          interviewerOpenId: "ou_int", interviewTime: 1,
          interviewStatus: "待安排", notificationStatus: "已通知",
        },
      }),
    } as unknown as BitableTables
    const handler = makeBitableChangeHandler({ bitable, interviewTableId })
    const got = vi.fn()
    bus.on("InterviewScheduled", got)
    await handler(envelope({ table_id: interviewTableId, action_list: [{ record_id: "rec3" }] }))
    await new Promise((r) => setImmediate(r))
    expect(got).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/feishu/events.bitableChange.test.ts`
Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/feishu/events/bitableChange.ts tests/feishu/events.bitableChange.test.ts
git commit -m "feat: Bitable change handler dispatching interview events"
```

---

### Task 17: InterviewAgent

**Files:**
- Create: `src/agents/interview/notify.ts`
- Create: `src/agents/interview/index.ts`
- Test: `tests/agents/interview.index.test.ts`

- [ ] **Step 1: Write `src/agents/interview/notify.ts`**

```ts
export function buildInterviewNotifyCard(opts: {
  candidateName: string
  interviewerName: string
  interviewTime: number
  recordId: string
}) {
  const when = new Date(opts.interviewTime).toISOString().replace("T", " ").slice(0, 16)
  return {
    config: { wide_screen_mode: true },
    header: { template: "blue", title: { tag: "plain_text", content: "新的面试安排" } },
    elements: [
      {
        tag: "div",
        fields: [
          { is_short: true, text: { tag: "lark_md", content: `**候选人**\n${opts.candidateName || "-"}` } },
          { is_short: true, text: { tag: "lark_md", content: `**面试时间**\n${when}` } },
          { is_short: false, text: { tag: "lark_md", content: `请准时参加，结束后在多维表格 Interview 表填写面评（recordId=${opts.recordId}）` } },
        ],
      },
    ],
  }
}

export function buildReviewReminderText(candidateName: string): string {
  return `面试已结束，请尽快在多维表格中填写面评：候选人 ${candidateName}`
}

export function buildHrSummaryText(opts: {
  candidateName: string
  reviewerName: string
  reviewResult: string
  nextStatus: string
}): string {
  return `【面评结果】候选人 ${opts.candidateName} | 面试官 ${opts.reviewerName} | 结果 ${opts.reviewResult} | 新状态 ${opts.nextStatus}`
}
```

- [ ] **Step 2: Write `src/agents/interview/index.ts`**

```ts
import type { BitableTables, CandidateStatus, ReviewResult } from "../../feishu/bitable.js"
import type { FeishuIM } from "../../feishu/im.js"
import { bus } from "../../events/bus.js"
import { nextCandidateStatus } from "./stateMachine.js"
import { buildInterviewNotifyCard, buildHrSummaryText } from "./notify.js"
import { logger } from "../../utils/logger.js"

export interface InterviewAgentDeps {
  bitable: BitableTables
  im: FeishuIM
  hrOpenIds: string[]
}

export function registerInterviewAgent(deps: InterviewAgentDeps): void {
  bus.on("InterviewScheduled", async (payload) => {
    try {
      const card = buildInterviewNotifyCard({
        candidateName: payload.candidateName,
        interviewerName: payload.interviewerName,
        interviewTime: payload.interviewTime,
        recordId: payload.interviewRecordId,
      })
      await deps.im.sendCardToUser(payload.interviewerOpenId, card)
      await deps.bitable.updateInterview(payload.interviewRecordId, {
        interviewStatus: "待面试",
        notificationStatus: "已通知",
      })
    } catch (err) {
      logger.error({ err }, "interviewAgent.scheduled.failed")
    }
  })

  bus.on("ReviewSubmitted", async (payload) => {
    try {
      const candidate = await deps.bitable.findCandidateByCandidateId(payload.candidateId)
      const currentStatus = (candidate?.fields.status ?? "待筛选") as CandidateStatus
      const nextStatus = nextCandidateStatus(currentStatus, payload.reviewResult as ReviewResult)

      await deps.bitable.updateInterview(payload.interviewRecordId, { interviewStatus: "已完成" })

      if (candidate && nextStatus !== currentStatus) {
        await deps.bitable.updateCandidate(candidate.record_id, { status: nextStatus })
      }

      const text = buildHrSummaryText({
        candidateName: payload.candidateName,
        reviewerName: payload.interviewerName,
        reviewResult: payload.reviewResult,
        nextStatus,
      })
      for (const openId of deps.hrOpenIds) {
        try {
          await deps.im.sendTextToUser(openId, text)
        } catch (err) {
          logger.error({ err, openId }, "interviewAgent.hr_notify.failed")
        }
      }
    } catch (err) {
      logger.error({ err }, "interviewAgent.review.failed")
    }
  })
}
```

- [ ] **Step 3: Write `tests/agents/interview.index.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { registerInterviewAgent } from "../../src/agents/interview/index.js"
import { bus } from "../../src/events/bus.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuIM } from "../../src/feishu/im.js"

function deps(currentStatus = "技术面") {
  const updateInterview = vi.fn().mockResolvedValue(undefined)
  const updateCandidate = vi.fn().mockResolvedValue(undefined)
  const findCandidateByCandidateId = vi.fn().mockResolvedValue({
    record_id: "recCand",
    fields: { status: currentStatus },
  })
  const bitable = { updateInterview, updateCandidate, findCandidateByCandidateId } as unknown as BitableTables
  const im = {
    sendCardToUser: vi.fn().mockResolvedValue(undefined),
    sendTextToUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as FeishuIM
  return { bitable, im, updateInterview, updateCandidate, findCandidateByCandidateId }
}

describe("InterviewAgent", () => {
  beforeEach(() => {
    bus["ee"].removeAllListeners()
  })

  it("on InterviewScheduled: sends card and updates interview row", async () => {
    const d = deps()
    registerInterviewAgent({ bitable: d.bitable, im: d.im, hrOpenIds: ["ou_hr"] })

    bus.emit("InterviewScheduled", {
      interviewRecordId: "rec1",
      candidateId: "c1",
      candidateName: "张三",
      interviewerName: "李四",
      interviewerOpenId: "ou_int",
      interviewTime: 1_700_000_000_000,
    })
    await new Promise((r) => setTimeout(r, 10))

    expect(d.im.sendCardToUser).toHaveBeenCalledWith("ou_int", expect.any(Object))
    expect(d.updateInterview).toHaveBeenCalledWith("rec1", {
      interviewStatus: "待面试",
      notificationStatus: "已通知",
    })
  })

  it("on ReviewSubmitted (通过 from 技术面): updates status to HR面 and notifies HR", async () => {
    const d = deps("技术面")
    registerInterviewAgent({ bitable: d.bitable, im: d.im, hrOpenIds: ["ou_hr1", "ou_hr2"] })

    bus.emit("ReviewSubmitted", {
      interviewRecordId: "rec1",
      candidateId: "c1",
      candidateName: "张三",
      interviewerName: "李四",
      reviewContent: "ok",
      reviewResult: "通过",
    })
    await new Promise((r) => setTimeout(r, 10))

    expect(d.updateInterview).toHaveBeenCalledWith("rec1", { interviewStatus: "已完成" })
    expect(d.updateCandidate).toHaveBeenCalledWith("recCand", { status: "HR面" })
    expect(d.im.sendTextToUser).toHaveBeenCalledTimes(2)
    expect(d.im.sendTextToUser).toHaveBeenCalledWith("ou_hr1", expect.stringContaining("HR面"))
  })

  it("does not update candidate if status would not change (待定)", async () => {
    const d = deps("技术面")
    registerInterviewAgent({ bitable: d.bitable, im: d.im, hrOpenIds: ["ou_hr"] })

    bus.emit("ReviewSubmitted", {
      interviewRecordId: "rec1",
      candidateId: "c1",
      candidateName: "张三",
      interviewerName: "李四",
      reviewContent: "ok",
      reviewResult: "待定",
    })
    await new Promise((r) => setTimeout(r, 10))

    expect(d.updateCandidate).not.toHaveBeenCalled()
    expect(d.updateInterview).toHaveBeenCalledWith("rec1", { interviewStatus: "已完成" })
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/agents/interview.index.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/agents/interview tests/agents/interview.index.test.ts
git commit -m "feat: InterviewAgent (notify + status update + HR summary)"
```

---

### Task 18: Review reminder scheduler

**Files:**
- Create: `src/scheduler/reviewReminder.ts`
- Test: `tests/scheduler/reviewReminder.test.ts`

- [ ] **Step 1: Write `src/scheduler/reviewReminder.ts`**

```ts
import cron from "node-cron"
import type { BitableTables } from "../feishu/bitable.js"
import type { FeishuIM } from "../feishu/im.js"
import { buildReviewReminderText } from "../agents/interview/notify.js"
import { logger } from "../utils/logger.js"

export interface ReviewReminderDeps {
  bitable: BitableTables
  im: FeishuIM
}

export async function runReviewReminderOnce(deps: ReviewReminderDeps, now = Date.now()): Promise<number> {
  const rows = await deps.bitable.listInterviewsNeedingReminder(now)
  let sent = 0
  for (const row of rows) {
    const openId = row.fields.interviewerOpenId
    const name = row.fields.candidateName ?? ""
    if (!openId) continue
    try {
      await deps.im.sendTextToUser(openId, buildReviewReminderText(name))
      await deps.bitable.updateInterview(row.record_id, { notificationStatus: "已提醒面评" })
      sent++
    } catch (err) {
      logger.error({ err, recordId: row.record_id }, "reviewReminder.send_failed")
    }
  }
  return sent
}

export function startReviewReminder(deps: ReviewReminderDeps, cronExpr = "*/5 * * * *"): void {
  cron.schedule(cronExpr, async () => {
    try {
      const n = await runReviewReminderOnce(deps)
      if (n > 0) logger.info({ sent: n }, "reviewReminder.tick")
    } catch (err) {
      logger.error({ err }, "reviewReminder.tick.failed")
    }
  })
}
```

- [ ] **Step 2: Write `tests/scheduler/reviewReminder.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest"
import { runReviewReminderOnce } from "../../src/scheduler/reviewReminder.js"
import type { BitableTables } from "../../src/feishu/bitable.js"
import type { FeishuIM } from "../../src/feishu/im.js"

describe("runReviewReminderOnce", () => {
  it("sends to all returned rows and marks 已提醒面评", async () => {
    const rows = [
      { record_id: "r1", fields: { interviewerOpenId: "ou_a", candidateName: "张三" } },
      { record_id: "r2", fields: { interviewerOpenId: "ou_b", candidateName: "李四" } },
      { record_id: "r3", fields: { interviewerOpenId: undefined, candidateName: "无人" } },
    ]
    const updateInterview = vi.fn().mockResolvedValue(undefined)
    const bitable = {
      listInterviewsNeedingReminder: vi.fn().mockResolvedValue(rows),
      updateInterview,
    } as unknown as BitableTables
    const im = { sendTextToUser: vi.fn().mockResolvedValue(undefined) } as unknown as FeishuIM

    const sent = await runReviewReminderOnce({ bitable, im }, 9_999_999_999_999)
    expect(sent).toBe(2)
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_a", expect.stringContaining("张三"))
    expect(im.sendTextToUser).toHaveBeenCalledWith("ou_b", expect.stringContaining("李四"))
    expect(updateInterview).toHaveBeenCalledWith("r1", { notificationStatus: "已提醒面评" })
    expect(updateInterview).toHaveBeenCalledWith("r2", { notificationStatus: "已提醒面评" })
    expect(updateInterview).not.toHaveBeenCalledWith("r3", expect.anything())
  })

  it("returns 0 when nothing to remind", async () => {
    const bitable = {
      listInterviewsNeedingReminder: vi.fn().mockResolvedValue([]),
      updateInterview: vi.fn(),
    } as unknown as BitableTables
    const im = { sendTextToUser: vi.fn() } as unknown as FeishuIM
    const sent = await runReviewReminderOnce({ bitable, im })
    expect(sent).toBe(0)
    expect(im.sendTextToUser).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/scheduler/reviewReminder.test.ts`
Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/scheduler tests/scheduler
git commit -m "feat: review reminder scheduler (5-min cron scan)"
```

---

## Phase 5 — Wiring, docs, debug

### Task 19: Wire everything in `src/app.ts` + /debug/whoami

**Files:**
- Modify: `src/app.ts`

- [ ] **Step 1: Replace `src/app.ts` with the wired version**

```ts
import express from "express"
import { logger } from "./utils/logger.js"
import { env } from "./config/env.js"
import { FeishuClient } from "./feishu/client.js"
import { BitableTables } from "./feishu/bitable.js"
import { FeishuIM } from "./feishu/im.js"
import { createDeepSeekProvider } from "./ai/deepseek.js"
import { createWebhookRouter } from "./webhook/router.js"
import { FeishuEventDispatcher } from "./webhook/dispatcher.js"
import { makeBotMessageHandler } from "./feishu/events/botMessage.js"
import { makeBitableChangeHandler } from "./feishu/events/bitableChange.js"
import { registerResumeAgent } from "./agents/resume/index.js"
import { registerInterviewAgent } from "./agents/interview/index.js"
import { startReviewReminder } from "./scheduler/reviewReminder.js"

export function createApp() {
  const app = express()
  app.use(express.json({ limit: "2mb" }))

  const client = new FeishuClient({ appId: env.feishu.appId, appSecret: env.feishu.appSecret })
  const bitable = new BitableTables(client, env.feishu.bitableAppToken, env.tables)
  const im = new FeishuIM(client)
  const ai = createDeepSeekProvider(env.deepseek)
  const dispatcher = new FeishuEventDispatcher()

  registerResumeAgent({ ai, bitable, im })
  registerInterviewAgent({ bitable, im, hrOpenIds: env.hrOpenIds })

  dispatcher.register("im.message.receive_v1", makeBotMessageHandler(im))
  dispatcher.register("drive.file.bitable_record_changed", makeBitableChangeHandler({ bitable, interviewTableId: env.tables.interview }))

  app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }))

  app.use("/webhook", createWebhookRouter({
    encryptKey: env.feishu.encryptKey,
    verificationToken: env.feishu.verificationToken,
    dispatcher,
  }))

  // Debug endpoint: when invoked, returns whatever payload it can read about
  // recent senders. Easiest way: just log all sender open_ids during bot
  // message handling (already done by logger) — this endpoint just returns ok
  // so you can verify your domain routes traffic.
  app.get("/debug/whoami", (_req, res) => {
    res.json({ ok: true, hint: "Send any message to the bot; the open_id will be logged at debug level." })
  })

  startReviewReminder({ bitable, im })

  return app
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const app = createApp()
  app.listen(env.port, () => {
    logger.info({ port: env.port }, "recruit-agent listening")
  })
}
```

- [ ] **Step 2: Add a debug log of open_id inside bot message handler**

Modify `src/feishu/events/botMessage.ts`, at the top of the returned `handle` function (right after `if (!senderOpenId) return`), insert:

```ts
logger.info({ openId: senderOpenId, type: ev.message.message_type }, "botMessage.received")
```

(`logger` is already imported.)

- [ ] **Step 3: Confirm existing tests still pass**

Run: `npm test`
Expected: all previous tests still pass; no new tests for `app.ts` wiring (covered indirectly by individual unit tests).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app.ts src/feishu/events/botMessage.ts
git commit -m "feat: wire all agents/handlers + /debug/whoami"
```

---

### Task 20: `docs/feishu-setup.md`

**Files:**
- Create: `docs/feishu-setup.md`

- [ ] **Step 1: Write `docs/feishu-setup.md`**

```markdown
# 飞书后台配置指南

完成以下所有步骤后，把 `.env.example` 的变量都填到 `.env` 里。

## 1. 创建自建应用

1. 登录 [飞书开放平台](https://open.feishu.cn) 开发者后台
2. 「创建企业自建应用」，填名称（例：招聘助手）、上传 logo
3. 记录 **App ID**（`cli_xxxx`）和 **App Secret**

## 2. 启用机器人

应用详情 → 「应用能力」 → 添加「机器人」

## 3. 配置事件订阅

应用详情 → 「事件与回调」 → 「事件订阅」

- **请求地址**：`https://<你的域名>/webhook/feishu`
- **加密策略**：开启「Encrypt Key」和「Verification Token」，**两个都记录**
- **添加事件**：
  - `接收消息 v1.0` → `im.message.receive_v1`
  - `多维表格记录变更` → `drive.file.bitable_record_changed`

> 启用回调后飞书会立刻向你的 URL 发送 URL Verification。本系统的 `/webhook/feishu` 已自动处理 challenge。

## 4. 申请权限

应用详情 → 「权限管理」

- `im:message`
- `im:message:send_as_bot`
- `im:resource`
- `bitable:app`
- `contact:user.base:readonly`

> 申请完后需要管理员审批。个人版飞书自建应用通常即时生效。

## 5. 创建多维表格 + 4 张表

1. 飞书云文档 → 新建多维表格（例：`招聘助手数据库`）
2. 创建 4 张数据表：`Candidate` / `Referral` / `Interview` / `JobDescription`
3. 字段（必须与代码一致）：

### Candidate
| 字段名 | 类型 |
| --- | --- |
| candidateId | 文本 |
| name | 文本 |
| position | 文本 |
| phone | 文本 |
| email | 文本 |
| skills | 多选 |
| resumeSource | 单选（飞书机器人 / 手动 / 邮件） |
| resumeUrl | 文本 |
| status | 单选（待筛选 / 初筛通过 / 技术面 / HR面 / Offer / 入职 / 淘汰） |
| matchScore | 数字 |
| priority | 单选（高 / 中 / 低） |
| createdAt | 日期 |

### Interview
| 字段名 | 类型 |
| --- | --- |
| interviewId | 文本 |
| candidateId | 文本 |
| candidateName | 文本 |
| interviewerName | 文本 |
| interviewerOpenId | 文本 |
| interviewTime | 日期 |
| interviewStatus | 单选（待安排 / 待面试 / 待面评 / 已完成） |
| reviewContent | 多行文本 |
| reviewResult | 单选（通过 / 待定 / 淘汰） |
| notificationStatus | 单选（未通知 / 已通知 / 已提醒面评） |

### Referral
| 字段名 | 类型 |
| --- | --- |
| candidateId | 文本 |
| candidateName | 文本 |
| referrerName | 文本 |
| referrerOpenId | 文本 |
| referralTime | 日期 |
| currentStatus | 文本 |

### JobDescription
| 字段名 | 类型 |
| --- | --- |
| jobId | 文本 |
| position | 文本 |
| requirement | 多行文本 |
| headCount | 数字 |

## 6. 把应用加入多维表格协作者

打开多维表格 → 右上角「分享」/「协作者」→ 搜索你刚创建的应用名 → 添加为「可编辑」。
**不做这一步，所有 API 调用会返回 permission denied。**

## 7. 记录 Bitable token 与 table id

打开多维表格，看浏览器 URL：
```
https://xxx.feishu.cn/base/<APP_TOKEN>?table=<TABLE_ID>&view=...
```
- `<APP_TOKEN>` → `FEISHU_BITABLE_APP_TOKEN`
- 每张表点开后的 `<TABLE_ID>` → 分别对应 `FEISHU_TABLE_CANDIDATE` / `_INTERVIEW` / `_REFERRAL` / `_JD`

## 8. 拿到 HR 和面试官的 open_id

最简方式：
1. 部署服务后，启动 `LOG_LEVEL=debug npm run start`
2. 让 HR 和面试官分别给机器人发一句话
3. 日志里会打印 `botMessage.received` + `openId`
4. 把这些 `ou_xxxx` 填入 `.env`：
   - HR 的填 `HR_OPEN_IDS`（多个用逗号分隔）
   - 面试官的填到 Bitable Interview 表 `interviewerOpenId` 字段（每条面试记录手动填）

## 9. 验证

- 访问 `https://<你的域名>/health`，应返回 `{"ok":true,...}`
- 在飞书后台「事件订阅」页面点「验证」，应返回成功
- 给机器人私聊发一段简历文本，应收到 "已收到，正在解析…" + 入库卡片
```

- [ ] **Step 2: Commit**

```bash
git add docs/feishu-setup.md
git commit -m "docs: feishu admin setup guide"
```

---

### Task 21: `docs/deploy.md`

**Files:**
- Create: `docs/deploy.md`
- Create: `ecosystem.config.js`

- [ ] **Step 1: Write `ecosystem.config.js`**

```js
module.exports = {
  apps: [
    {
      name: "recruit-agent",
      script: "dist/app.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      time: true,
    },
  ],
}
```

- [ ] **Step 2: Write `docs/deploy.md`**

```markdown
# 部署指南

## 环境
- Node.js 18+
- pm2（`npm i -g pm2`）
- Nginx
- 一个解析到本机的域名（例：`recruit.example.com`）
- Let's Encrypt（acme.sh）

## 部署步骤

1. **拉代码 + 安装 + 构建**

```bash
git clone <repo> /opt/recruit-agent
cd /opt/recruit-agent
npm ci
cp .env.example .env
# 编辑 .env 填入所有变量
npm run build
```

2. **pm2 启动**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # 跟随系统启动
```

3. **Nginx 反代**

`/etc/nginx/conf.d/recruit-agent.conf`:

```nginx
server {
    listen 80;
    server_name recruit.example.com;
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name recruit.example.com;

    ssl_certificate     /etc/letsencrypt/live/recruit.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/recruit.example.com/privkey.pem;

    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 60s;
    }
}
```

`nginx -t && systemctl reload nginx`

4. **SSL（acme.sh + Let's Encrypt）**

```bash
curl https://get.acme.sh | sh
~/.acme.sh/acme.sh --issue -d recruit.example.com --nginx
~/.acme.sh/acme.sh --install-cert -d recruit.example.com \
  --key-file /etc/letsencrypt/live/recruit.example.com/privkey.pem \
  --fullchain-file /etc/letsencrypt/live/recruit.example.com/fullchain.pem \
  --reloadcmd "systemctl reload nginx"
```

5. **验证**

```bash
curl https://recruit.example.com/health
# {"ok":true,"ts":...}
```

6. **更新部署**

```bash
cd /opt/recruit-agent
git pull
npm ci
npm run build
pm2 reload recruit-agent
```

## 排错

- `pm2 logs recruit-agent` 看应用日志
- `tail -f /var/log/nginx/access.log` 看请求是否到达
- 飞书后台「事件订阅」页面点「验证」失败 → 检查域名是否 HTTPS、`FEISHU_ENCRYPT_KEY` 是否与后台一致
```

- [ ] **Step 3: Commit**

```bash
git add docs/deploy.md ecosystem.config.js
git commit -m "docs: deployment guide (pm2 + nginx + acme)"
```

---

### Task 22: Final README + run-through

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Preserve existing README content**

Run: `cp README.md README.business.md.tmp`

This saves the current business 背景 content; we'll append it to the new README.

- [ ] **Step 2: Replace `README.md` with the new project README (then append the saved business 背景)**

Write a new `README.md` whose body is exactly:

```markdown
# 招聘助手 Agent

基于飞书生态的招聘流程自动化服务。MVP 覆盖 M1（简历解析入库）和 M3（面试通知 + 面评回写 + 候选人状态推进）。

详细设计：[`docs/superpowers/specs/2026-06-11-recruit-agent-mvp-design.md`](docs/superpowers/specs/2026-06-11-recruit-agent-mvp-design.md)
实现计划：[`docs/superpowers/plans/2026-06-11-recruit-agent-mvp.md`](docs/superpowers/plans/2026-06-11-recruit-agent-mvp.md)

## 启动

### 准备

1. 按 [`docs/feishu-setup.md`](docs/feishu-setup.md) 在飞书后台创建应用、配权限、建表、加协作者
2. 准备一台公网可达的服务器和 HTTPS 域名（指引见 [`docs/deploy.md`](docs/deploy.md)）
3. 准备 DeepSeek API Key
4. 拷贝 `.env.example` 为 `.env`，填入所有变量

### 本地开发

```bash
npm install
npm run dev          # tsx watch，热重载
npm test             # 单元测试
npm run typecheck
```

### 生产部署

```bash
npm ci
npm run build
pm2 start ecosystem.config.js
```

## 功能

| 模块 | 状态 | 触发方式 |
| --- | --- | --- |
| M1 简历解析 | ✅ | 飞书机器人私聊（文本/PDF/TXT） |
| M3 面试通知 | ✅ | 飞书事件订阅（Bitable Interview 行变更） |
| M3 面评回写 | ✅ | 面试官在 Bitable 填 reviewResult |
| M3 状态推进 | ✅ | 自动 |
| M3 定时提醒填面评 | ✅ | node-cron 每 5 分钟扫描 |
| M2 内推流程 | 🔜 后续迭代 | - |
| M4 漏斗统计 | 🔜 后续迭代 | - |
| JD 匹配评分 | 🔜 后续迭代 | - |
| AI 面评草稿 | 🔜 后续迭代 | - |

## 目录结构

```text
src/
├── app.ts                      # 启动入口 + 装配
├── config/                     # env / 表 id
├── webhook/                    # 飞书事件入口 (校验+分发)
├── events/                     # 进程内事件总线
├── agents/                     # 业务领域处理器
│   ├── resume/
│   └── interview/
├── feishu/                     # 飞书 SDK adapter
│   ├── client.ts               # token / request
│   ├── bitable.ts              # Bitable CRUD
│   ├── im.ts                   # IM 收发
│   └── events/                 # 各类事件 handler
├── ai/                         # AIProvider 接口 + DeepSeek
├── scheduler/                  # 定时任务（面评提醒）
└── utils/                      # logger / dedupe / pdf
```

## 测试

```bash
npm test                  # 全部
npm test -- tests/agents  # 子目录
npm run test:watch
```

## 业务背景

（原始需求保留，见下方）

---
```

Then, after writing the new README, append the saved original content:

```bash
cat README.business.md.tmp >> README.md
rm README.business.md.tmp
```

- [ ] **Step 3: Manual smoke test (run by you, not by agent)**

This step is documented for the human running the demo. Skip if no Feishu credentials yet.

1. `.env` 填好所有变量
2. `npm run build && pm2 start ecosystem.config.js`
3. 飞书后台「事件订阅」→「验证」→ 看到成功
4. 私聊机器人粘贴一段简历 → 收到入库卡片 → 多维表格 Candidate 表出现新行
5. HR 在 Bitable Interview 表加一行：`candidateId`、`interviewerOpenId`、`interviewerName`、`interviewTime` → 几秒内 `interviewStatus` 自动变 `待面试` + 面试官收到卡片
6. 面试官在 Bitable 填 `reviewContent` 和 `reviewResult=通过` → `interviewStatus` 变 `已完成` + Candidate `status` 推进 + HR 收到汇总消息

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: project README with usage and module status"
```

---

## Self-review notes

This plan covers the spec section by section:

| Spec section | Implemented in tasks |
| --- | --- |
| §3 Architecture | Tasks 3, 5, 7–11, 19 |
| §4 Project structure | Tasks 1–22 (created incrementally) |
| §5 Data model | Tasks 8 (TypeScript) + 20 (Bitable docs) |
| §6 M1 flow | Tasks 9, 12–14 |
| §7 M3 flow + state machine + reminder | Tasks 15–18 |
| §8 Feishu prep | Task 20 |
| §9 Deploy | Task 21 |
| §10 Deliverables | All tasks |

Type-name consistency check: `CandidateStatus`, `ReviewResult`, `InterviewStatus` defined once in `feishu/bitable.ts` and reused everywhere. Event payload types defined once in `events/types.ts`. No drift detected.

No placeholders, no TODOs, every task has runnable test commands or explicit smoke-test instructions.
