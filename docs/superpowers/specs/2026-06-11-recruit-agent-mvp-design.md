# 招聘助手 Agent MVP 设计文档

> 适用版本：MVP（端到端 M1 + M3 最小闭环）
> 上游需求：`README.md`（业务背景）、`技术方案.md`（原始技术方案）
> 编写日期：2026-06-11

## 1. 目标与范围

### 1.1 目标
搭建一个跑在飞书生态里的招聘助手服务，覆盖**简历从进入系统到面试结果回写、候选人状态自动推进**的最小闭环，能在 demo 中端到端跑通 1 条候选人。

### 1.2 MVP 范围（本次实现）
| 模块 | 内容 |
| --- | --- |
| M1 简历获取与录入 | 飞书机器人接收私聊消息（文本/PDF/TXT），LLM 抽取关键信息，写入 Candidate 表 |
| M3 面试流程闭环 | HR 在 Bitable 录入面试 → 自动通知面试官 → 定时提醒面评 → 面评填写后自动推进候选人状态 + 通知 HR |

### 1.3 非范围（后续迭代，预留代码位）
- M2 内推流程
- M4 漏斗统计 & 自然语言查询
- JD 匹配评分（Candidate.matchScore / priority 字段先建好）
- AI 面评草稿生成

---

## 2. 技术选型

| 维度 | 选型 | 理由 |
| --- | --- | --- |
| 语言 / 运行时 | Node.js 18+ / TypeScript | 飞书官方 SDK 支持完善；TS 利于接口约束 |
| Web 框架 | Express | 轻量，demo 周期短，足够支撑单一 webhook |
| 数据存储 | 飞书多维表格 (Bitable) | 业务要求；零额外 DB 依赖 |
| LLM | DeepSeek（默认） | 中文场景、价格、国内稳定性。代码层用 `AIProvider` 接口隔离，可替换 |
| 事件总线 | Node `EventEmitter`（进程内） | MVP 单进程足够；后续可换 Redis/Kafka |
| 定时任务 | `node-cron`（5 分钟扫描） | 比 `setTimeout` 更可靠，进程重启不丢任务 |
| 日志 | `pino` | 结构化、快 |
| 测试 | `vitest` | TS 友好、零配置 |
| PDF 解析 | `pdf-parse` | 简历常见格式 |
| 进程管理 | `pm2` | 服务器部署 |
| 反代 / TLS | Nginx + Let's Encrypt | 飞书事件订阅必须 HTTPS |

---

## 3. 整体架构

```text
┌─────────────────┐     私聊简历      ┌──────────────────────────────────┐
│  HR / 内推人    │ ─────────────▶  │  飞书机器人 (Lark Bot)            │
└─────────────────┘                  └──────────────┬───────────────────┘
                                                    │ 事件回调 HTTPS
                                                    ▼
┌─────────────────┐     编辑面试行    ┌──────────────────────────────────┐
│  HR (Bitable)   │ ─────────────▶  │  飞书事件订阅 (Bitable Change)    │
└─────────────────┘                  └──────────────┬───────────────────┘
                                                    │
                                                    ▼
                          ┌───────────────────────────────────────────────┐
                          │   Node.js 服务 (云服务器, HTTPS 域名)         │
                          │                                                │
                          │   Express                                      │
                          │     ├── POST /webhook/feishu                  │
                          │     ├── GET  /health                          │
                          │     └── GET  /debug/whoami (临时, 出 open_id) │
                          │                                                │
                          │   EventBus (Node EventEmitter)                 │
                          │     ├── ResumeReceived  → ResumeAgent          │
                          │     ├── InterviewScheduled → InterviewAgent    │
                          │     └── ReviewSubmitted → InterviewAgent       │
                          │                                                │
                          │   Agents                                       │
                          │     ├── ResumeAgent     (LLM 抽取 → Bitable)  │
                          │     └── InterviewAgent  (通知 / 状态机)       │
                          │                                                │
                          │   Adapters                                     │
                          │     ├── FeishuClient (Bitable + IM + 事件解密) │
                          │     └── AIProvider   (DeepSeek 实现)           │
                          │                                                │
                          │   Scheduler                                    │
                          │     └── reviewReminder (每 5 分钟扫描)        │
                          └────────────────┬───────────────────────────────┘
                                           │
                                           ▼
                          ┌───────────────────────────────────────────────┐
                          │   飞书多维表格 (Bitable)                       │
                          │     Candidate / Referral / Interview / JD     │
                          └───────────────────────────────────────────────┘
```

### 3.1 关键设计决定

1. **单一入口 webhook**：所有飞书事件打到 `POST /webhook/feishu`，做完 URL Challenge 校验、AES 解密、签名校验后通过 `header.event_type` 分发。
2. **本地事件总线**：MVP 用 Node `EventEmitter`，不引入 Redis/Kafka。
3. **Agent = 业务领域处理器**：消费事件、调 LLM/Feishu、写表的业务逻辑模块，不是会话式 AI Agent。
4. **Adapter 隔离外部依赖**：`FeishuClient` 和 `AIProvider` 接口 + 实现分离，单测时用 fake 替换。
5. **不使用 Bitable 原生 Link 字段**：用 `candidateId` 文本字段做跨表关联，避免 Link 字段 API 复杂度，便于代码控制。
6. **必须保存 open_id**：通知通过私聊发，必须依赖 open_id；name 仅用于人工浏览。

---

## 4. 项目目录结构

```text
recruit-agent/
├── src/
│   ├── app.ts                      # Express 启动 + 路由挂载 + 事件订阅注册
│   ├── config/
│   │   ├── env.ts                  # 读 .env, 类型化导出
│   │   └── feishu.tables.ts        # Bitable app_token + 各 table_id
│   ├── webhook/
│   │   ├── router.ts               # POST /webhook/feishu
│   │   ├── verify.ts               # URL Challenge + AES 解密 + 签名校验
│   │   └── dispatcher.ts           # 事件类型 → handler
│   ├── events/
│   │   ├── bus.ts                  # EventEmitter 单例
│   │   └── types.ts                # 事件 payload 类型
│   ├── agents/
│   │   ├── resume/
│   │   │   ├── index.ts            # 订阅 ResumeReceived
│   │   │   ├── parse.ts            # 调 LLM 抽取
│   │   │   └── prompts.ts
│   │   └── interview/
│   │       ├── index.ts            # 订阅 InterviewScheduled / ReviewSubmitted
│   │       ├── notify.ts           # 通知文案/卡片
│   │       └── stateMachine.ts     # 面评结果 → 候选人状态映射 (纯函数)
│   ├── feishu/
│   │   ├── client.ts               # tenant_access_token 缓存
│   │   ├── bitable.ts              # Candidate/Interview/... CRUD
│   │   ├── im.ts                   # 发消息 / 卡片
│   │   └── events/
│   │       ├── botMessage.ts       # im.message.receive_v1 处理
│   │       └── bitableChange.ts    # drive.file.bitable_record_changed 处理
│   ├── ai/
│   │   ├── provider.ts             # interface AIProvider
│   │   └── deepseek.ts             # DeepSeek 实现
│   ├── scheduler/
│   │   └── reviewReminder.ts       # 5 分钟扫描，提醒未填面评
│   └── utils/
│       ├── logger.ts               # pino
│       ├── pdf.ts                  # pdf-parse 提取
│       └── dedupe.ts               # event_id LRU 去重
├── tests/
│   ├── agents/
│   │   ├── resume.parse.test.ts
│   │   ├── interview.stateMachine.test.ts
│   │   └── interview.index.test.ts
│   ├── feishu/
│   │   ├── events.botMessage.test.ts
│   │   └── events.bitableChange.test.ts
│   └── ai/
│       └── deepseek.test.ts        # 用 mock fetch
├── docs/
│   ├── feishu-setup.md             # 飞书后台配置指南（你按这个去做）
│   └── deploy.md                   # 服务器部署指南
├── ecosystem.config.js             # pm2 配置
├── .env.example
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 5. 数据模型

> 所有字段均落地到飞书多维表格。表关联用 `candidateId` 文本字段，不用 Bitable Link。

### 5.1 Candidate（候选人表）

| 字段名 | Bitable 类型 | 备注 |
| --- | --- | --- |
| candidateId | 文本 | 业务主键，UUID |
| name | 文本 | |
| position | 文本 | 应聘岗位 |
| phone | 文本 | |
| email | 文本 | |
| skills | 多选 | LLM 抽出 |
| resumeSource | 单选 | `飞书机器人` / `手动` / `邮件` |
| resumeUrl | 文本(URL) | 原文件链接，可选 |
| status | 单选 | `待筛选` / `初筛通过` / `技术面` / `HR面` / `Offer` / `入职` / `淘汰` |
| matchScore | 数字 | 预留，MVP 不写 |
| priority | 单选 | `高` / `中` / `低`，预留 |
| createdAt | 日期 | |

### 5.2 Interview（面试表）

| 字段名 | Bitable 类型 | 备注 |
| --- | --- | --- |
| interviewId | 文本 | UUID |
| candidateId | 文本 | 关联 Candidate.candidateId |
| candidateName | 文本 | 冗余 |
| interviewerName | 文本 | |
| interviewerOpenId | 文本 | **必填**，发私聊用 |
| interviewTime | 日期时间 | |
| interviewStatus | 单选 | `待安排` / `待面试` / `待面评` / `已完成` |
| reviewContent | 长文本 | 面试官填 |
| reviewResult | 单选 | `通过` / `待定` / `淘汰` |
| notificationStatus | 单选 | `未通知` / `已通知` / `已提醒面评` |

### 5.3 Referral（内推表，建表但 MVP 不消费）

| 字段名 | Bitable 类型 | 备注 |
| --- | --- | --- |
| candidateId | 文本 | |
| candidateName | 文本 | |
| referrerName | 文本 | |
| referrerOpenId | 文本 | |
| referralTime | 日期时间 | |
| currentStatus | 文本 | |

### 5.4 JobDescription（JD 表，建表但 MVP 不消费）

| 字段名 | Bitable 类型 | 备注 |
| --- | --- | --- |
| jobId | 文本 | |
| position | 文本 | |
| requirement | 长文本 | |
| headCount | 数字 | |

---

## 6. M1 简历流程详细设计

### 6.1 用户视角
1. HR 或内推人在飞书私聊"招聘助手"机器人。
   - 文本：直接粘贴简历文字
   - 文件：上传 PDF 或 TXT
2. 机器人立刻回："已收到，正在解析…"
3. 解析完成后机器人回结构化卡片："候选人 张三 / 前端 / React、TS / 已写入候选人库 ✅"
4. Bitable Candidate 表新增一行，status = `待筛选`

### 6.2 系统流程
```text
飞书 → POST /webhook/feishu
        │
        ▼
  verify.ts: URL Challenge / AES 解密 / 签名校验
        │
        ▼
  dispatcher.ts (header.event_type === "im.message.receive_v1")
        │
        ▼
  feishu/events/botMessage.ts
     ├─ message_type = text → 取 content.text
     └─ message_type = file → IM 下载 → 若 PDF 用 pdf-parse 抽文本
     - 立刻回复 "已收到，正在解析…"
     - 发 ResumeReceived {text, senderOpenId, sourceMessageId}
        │
        ▼
  agents/resume/index.ts (订阅 ResumeReceived)
     - parse.ts: AIProvider.chat(RESUME_PROMPT + text) → JSON
     - bitable.ts: createCandidateRecord(...)
     - im.ts: 回卡片给 senderOpenId
```

### 6.3 LLM Prompt（`agents/resume/prompts.ts`）
```text
你是招聘信息抽取助手。从下面的简历文本中抽取关键信息，严格按 JSON 返回，
不要任何解释文字。字段不存在时填 null 或 []。

字段定义：
- name: string | null
- phone: string | null
- email: string | null
- position: string | null
- yearsOfExperience: number | null
- skills: string[]  最多 8 个，通用名称

输出格式（不要 markdown 代码块）：
{"name":"...","phone":"...","email":"...","position":"...","yearsOfExperience":3,"skills":["..."]}

简历文本：
"""
{{RESUME_TEXT}}
"""
```
- 调用前裁剪 `RESUME_TEXT` 到 12000 字符。

### 6.4 错误处理
| 情况 | 处理 |
| --- | --- |
| LLM 返回非 JSON | 正则提取 `{...}`；失败则机器人回"解析失败，请粘贴文本格式" |
| PDF 提取出空文本 | 机器人回"PDF 无法提取文字，可能是扫描件，请粘贴文本" |
| name/phone/email 全空 | 机器人回"未识别到关键信息，请检查内容" |
| Bitable 写入失败 | 日志 + 机器人回"写入失败，请联系管理员" + dead-letter（本地 JSON） |
| 飞书事件重复投递 | `header.event_id` LRU 去重，缓存近 1000 条 |

### 6.5 测试
- `tests/agents/resume.parse.test.ts`：mock AIProvider，真实简历样本，断言抽取字段
- `tests/feishu/events.botMessage.test.ts`：mock FeishuClient，断言事件分发

---

## 7. M3 面试流程详细设计

### 7.1 用户视角
1. HR 在 Bitable Interview 表新增行：`candidateId` + `interviewerOpenId` + `interviewerName` + `interviewTime`。`interviewStatus` 默认 `待安排`。
2. 系统检测后：
   - `interviewStatus` → `待面试`
   - 私聊 `interviewerOpenId` 发面试通知卡片
   - `notificationStatus` → `已通知`
3. `interviewTime + 1h` 后若 `reviewContent` 仍为空：
   - 私聊面试官 "请填写面评"
   - `notificationStatus` → `已提醒面评`
4. 面试官直接在 Bitable 编辑该行：填 `reviewContent`、选 `reviewResult`
5. 系统检测到 `reviewResult` 被填：
   - `interviewStatus` → `已完成`
   - 根据 `reviewResult` 推进 Candidate.status
   - 给 HR 发汇总通知

### 7.2 系统流程
```text
HR 编辑 Interview 行 → 飞书事件订阅
   event_type === "drive.file.bitable_record_changed"
        │ (app_token, table_id, record_id, action_list)
        ▼
  feishu/events/bitableChange.ts
     - 过滤 table_id：只处理 Interview 表
     - 读整行最新内容
     - 分发条件：
        ① interviewStatus=待安排 且 interviewTime 已填  → InterviewScheduled
        ② reviewResult 刚被填上 且 interviewStatus != 已完成  → ReviewSubmitted
        ③ 其它字段变化忽略
        │
        ▼
  agents/interview/index.ts
     ├─ on(InterviewScheduled):
     │     - notify.ts 拼装卡片
     │     - im.ts 私聊面试官
     │     - bitable.ts 更新 interviewStatus=待面试 / notificationStatus=已通知
     │
     └─ on(ReviewSubmitted):
           - stateMachine.ts 计算 candidateNextStatus
           - bitable.ts 更新 Interview.interviewStatus=已完成
           - bitable.ts 更新 Candidate.status
           - im.ts 通知 HR
```

### 7.3 定时提醒（`scheduler/reviewReminder.ts`）
- `node-cron` 每 5 分钟跑一次
- 查询 Interview 表：`interviewTime < now - 1h` 且 `notificationStatus != 已提醒面评` 且 `reviewContent 为空`
- 对每行发私聊提醒，更新 `notificationStatus = 已提醒面评`

### 7.4 状态机（`agents/interview/stateMachine.ts`，纯函数）
```ts
type Status = "待筛选" | "初筛通过" | "技术面" | "HR面" | "Offer" | "入职" | "淘汰"
type ReviewResult = "通过" | "待定" | "淘汰"

export function nextCandidateStatus(current: Status, review: ReviewResult): Status {
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
    default:
      return current
  }
}
```

### 7.5 HR 通知机制
- `.env` 配 `HR_OPEN_IDS=ou_xxx,ou_yyy`（逗号分隔），启动读
- MVP 不在 Bitable 维护 HR 列表

### 7.6 工程要点
- **幂等**：处理通知前先读 `notificationStatus`，已通知则跳过；`event_id` LRU 去重
- **速率限制**：`p-limit` 限并发 10，避免 LLM 批量调用打爆飞书 API
- **事件粒度**：Bitable 行变更事件含 `action_list`，但 MVP 简化为"读整行 + 状态判断"，不依赖 action_list 准确性

### 7.7 测试
- `tests/agents/interview.stateMachine.test.ts`：纯函数全分支覆盖
- `tests/agents/interview.index.test.ts`：mock FeishuClient + 发事件，断言通知 & 写表
- `tests/feishu/events.bitableChange.test.ts`：用真实事件 JSON 样本断言分发逻辑

---

## 8. 飞书准备清单（用户操作）

详细步骤写在 `docs/feishu-setup.md`，要点：

1. **创建自建应用**（开发者后台 → 创建企业自建应用），记 `App ID` / `App Secret`
2. **配置应用能力**
   - 启用机器人
   - 启用事件订阅，请求地址：`https://<your-domain>/webhook/feishu`
   - 开启 Encrypt Key + Verification Token（记录两个 token）
   - 订阅事件：`im.message.receive_v1`、`drive.file.bitable_record_changed`
3. **申请权限**：`im:message`、`im:message:send_as_bot`、`im:resource`、`bitable:app`、`contact:user.base:readonly`
4. **创建多维表格 + 4 张表**（Candidate / Referral / Interview / JobDescription），字段按 §5
   - 多维表格必须**添加应用为协作者**（否则 API 无权限读写）
   - 记录 `Bitable App Token` 和每张表的 `Table ID`
5. **拿 open_id**：临时 `/debug/whoami` 接口，让 HR / 面试官跟机器人说一句话，open_id 打到日志

完成后填 `.env`：
```text
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_VERIFICATION_TOKEN=xxx
FEISHU_ENCRYPT_KEY=xxx
FEISHU_BITABLE_APP_TOKEN=xxx
FEISHU_TABLE_CANDIDATE=tblxxx
FEISHU_TABLE_REFERRAL=tblxxx
FEISHU_TABLE_INTERVIEW=tblxxx
FEISHU_TABLE_JD=tblxxx
HR_OPEN_IDS=ou_xxx
DEEPSEEK_API_KEY=sk-xxx
PORT=3000
LOG_LEVEL=info
```

---

## 9. 部署

写在 `docs/deploy.md`：
- Node 18+
- `pm2` 守护
- Nginx 反代 443 → `127.0.0.1:3000`
- Let's Encrypt（`acme.sh`）出 SSL

---

## 10. MVP 交付物清单

| # | 交付物 | 责任方 |
| --- | --- | --- |
| 1 | `docs/feishu-setup.md` | 我 |
| 2 | `docs/deploy.md` | 我 |
| 3 | 项目代码（按 §4 结构） | 我 |
| 4 | M1 端到端可跑 | 我写 + 你验证 |
| 5 | M3 端到端可跑 | 我写 + 你验证 |
| 6 | 单元测试 | 我 |
| 7 | `.env.example` | 我 |
| 8 | `README.md` 启动指南 | 我 |
| 9 | 飞书 App + Bitable 创建 | 你 |
| 10 | 服务器 + 域名 + SSL | 你 |
| 11 | DeepSeek API Key | 你 |

---

## 11. 后续迭代（不在 MVP）

- M2 内推流程
- M4 漏斗统计 + 自然语言查询
- JD 匹配评分（写 Candidate.matchScore / priority）
- AI 面评草稿生成
- 异常处理（爽约、超时升级）
