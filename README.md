# 招聘助手 Agent

基于飞书生态的招聘流程自动化服务。MVP 覆盖 M1（简历解析入库）和 M3（面试通知 + 面评回写 + 候选人状态推进）。

- 详细设计：[`docs/superpowers/specs/2026-06-11-recruit-agent-mvp-design.md`](docs/superpowers/specs/2026-06-11-recruit-agent-mvp-design.md)
- 实现计划：[`docs/superpowers/plans/2026-06-11-recruit-agent-mvp.md`](docs/superpowers/plans/2026-06-11-recruit-agent-mvp.md)

## 启动

### 准备

1. 按 [`docs/feishu-setup.md`](docs/feishu-setup.md) 在飞书后台创建应用、配权限、建表、加协作者
2. 准备一台公网可达的服务器和 HTTPS 域名（指引见 [`docs/deploy.md`](docs/deploy.md)）
3. 准备 DeepSeek API Key（[https://platform.deepseek.com](https://platform.deepseek.com)）
4. 拷贝 `.env.example` 为 `.env`，填入所有变量

### 本地开发

```bash
npm install
npm run dev          # tsx watch，热重载
npm test             # 单元测试
npm run typecheck
```

> 注：`npm run dev` 启动时需要 `.env` 已填好所有飞书与 DeepSeek 变量；否则会立刻抛 `Missing env var: ...`。

### 生产部署

```bash
npm ci
npm run build
pm2 start ecosystem.config.cjs
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
npm test                  # 全部 52 个测试
npm test -- tests/agents  # 子目录
npm run test:watch
```

测试均使用 mock 替换外部依赖（飞书 / DeepSeek），不需要真实凭证。

## 端到端 Demo 验证步骤（需真实环境）

1. `.env` 填好所有变量（见 `.env.example`）
2. `npm run build && pm2 start ecosystem.config.cjs`
3. 飞书后台「事件订阅」→「验证」→ 看到成功
4. 私聊机器人粘贴一段简历 → 收到入库卡片 → 多维表格 Candidate 表出现新行
5. HR 在 Bitable Interview 表加一行：`candidateId`、`interviewerOpenId`、`interviewerName`、`interviewTime` → 几秒内 `interviewStatus` 自动变 `待面试` + 面试官收到卡片
6. 面试官在 Bitable 填 `reviewContent` 和 `reviewResult=通过` → `interviewStatus` 变 `已完成` + Candidate `status` 推进 + HR 收到汇总消息

---

## 业务背景（原始需求）

背景
公司当前招聘需求量大，HR日常大量时间消耗在简历整理、沟通协调、流程跟进上，面试官也需要手动填写面评。希望候选人搭建一个能自闭
环运转的招聘助理 Agent，覆盖从简历获取到数据复盘的完整链路。
业务目标
•帮 HR 更快、更多地获取候选人简历
• 减少 HR 和面试官在流程沟通上的手动操作
• 让招聘数据可见、可追踪、可分析
环境要求
注册飞书个人版账号即可，
Agent 框架不限，
OpenClaw 或自选
必做项（基础验收）
M1：简历获取与录入
• 从任意渠道（邮件/招聘平台/手动粘贴均可）获取候选人简历
• 自动解析关键信息，录入飞书多维表格
• 字段包含：姓名、应聘职位、联系方式、技能标签、简历来源、当前状态
M2：内推逻辑
• 员工通过飞书消息或表单提交内推候选人
• Agent 自动记录内推人，内推时间，关联到候选人记录
•候选人每推进一个阶段，自动通知内推人当前进展
• 内推状态全程可追踪
M3：面试流程闭环
•HR 在多维表格填好面试时间后，Agent 自动通知面试官
• 面试结束后自动提醒面试官填写面评
•面评提交后写回多维表格，候选人状态自动更新，HR收到汇总通知
M4：招聘漏斗统计
• 各阶段数量自动汇总：收到简历 初筛通过 面试完成 Offer 入职
• 支持按职位、时间段查询
• 可通过自然语言提问获取数据，如"本月前端岗漏斗情况"
开放项（自由发挥，不设上限）
01：人才Mapping
候选人入表后自动与JD匹配打分，输出技能契合度与优先级排序，帮HR快速筛选
02；渠道推荐&来源分析
根据职位特点推荐适合的招聘渠道；记录各渠道的简历量与转化率对比，辅助 HR 资源決策
03：面评自动生成
读取面试录音或妙记转录，结合JD考察维度自动生成面评草稿，面试官只需确认或微调
04：异常处理
候选人爽约、面试官临时取消、面评超时未填等场景的自动兜底与升级提醒
05：候选人沟通自动化
自动发送面试邀请、确认消息、拒信（HR审核后发），候选人回复后 Agent 理解意图并处理
06：招聘报表&分析
支持自然语言查询招聘数据；定期向管理层推送招聘健康度报告
交付要求
• 可运行的demo（录屏或现场演示均可）
•简要说明；你的设计思路、技术选型、以及如果继续迭代你会优先做什么
