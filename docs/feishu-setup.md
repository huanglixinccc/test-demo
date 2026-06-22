# 飞书后台 + 服务器准备指南

> **重要：步骤顺序经过精心安排。** 飞书事件订阅"验证 URL"必须能访问到已部署的服务，所以**先部署，再配事件订阅**。按本文档从上往下走即可。

---

## 阶段 A：飞书后台（先把可以拿到的凭证全部拿到，但暂不配事件订阅 URL）

### A1. 创建自建应用

1. 登录 [飞书开放平台](https://open.feishu.cn) 开发者后台
2. 「创建企业自建应用」，填名称（例：招聘助手）、上传 logo
3. 记录 **App ID**（`cli_xxxx`）和 **App Secret**

### A2. 启用机器人

应用详情 → 「应用能力」 → 添加「机器人」

#### A2.1 配置「绑定账号」菜单（可选）

应用详情 → 「应用能力」 → 「机器人」→ 「机器人自定义菜单」→ 编辑：

- 菜单状态：**开启**
- 新增菜单项，例如名称「绑定账号」
- 响应动作：**推送事件**
- 事件 Key：`bind_account`（须与代码中一致）
- 保存并发布应用版本

> 用户点击该菜单后，飞书会推送 `application.bot.menu_v6` 事件，`event_key` 为 `bind_account`，由独立模块 `src/modules/accountBinding/` 处理并回复引导卡片；用户点击卡片上的「开始绑定」按钮后，服务端通过卡片回调返回模板卡片 `AAqNR3G7hMhTQ`（含渠道选择框）。

#### A2.2 配置「选择职位」菜单（可选）

- 菜单名称：例如「选择职位」
- 响应动作：**推送事件**
- 事件 Key：`select_positions`

> 由独立模块 `src/modules/positionContext/` 处理，发送职位列表卡片；用户点击「选择」后记录当前工作区职位（持久化至 `data/position-context.json`）。

### A3. 申请权限（要审批，先申请着）

应用详情 → 「权限管理」 → 申请：

- `im:message`
- `im:message:send_as_bot`
- `im:resource`
- `bitable:app`
- `contact:user.base:readonly`
- `vc:reserve`（招聘看板创建飞书视频会议链接）

> 个人版自建应用通常即时生效，企业版需要管理员审批。

### A4. 生成事件订阅的 Encrypt Key 与 Verification Token（**URL 暂时不填**）

应用详情 → 「事件与回调」 → 「事件订阅」

- 开启「Encrypt Key」→ 飞书自动生成一串密钥，**复制保存**
- 开启「Verification Token」→ 同上，**复制保存**
- 「请求地址」**暂时留空**（先不点保存也行；如果要保存，可以先填一个占位 URL）
- 「事件订阅」列表**暂时不勾选**

> 这一步的关键：Encrypt Key 和 Verification Token 是应用级别的密钥，不依赖 URL。我们只是先把它们拿到手，方便填进 `.env`。

### A5. 创建多维表格 + 4 张表

> ⚠️ **重要：必须在「我的云空间」直接新建多维表格，不要建在「知识库 / Wiki」里。**
>
> Wiki 里的多维表格 URL 是 `xxx.feishu.cn/wiki/<WIKI_NODE_TOKEN>?table=...`，URL 里的 token 是 wiki 节点 token，**不是** `app_token`，直接填进 `.env` 会调用失败。
>
> 正确的多维表格 URL 应该是 `xxx.feishu.cn/base/<APP_TOKEN>?table=<TABLE_ID>`，token 才是真正可用的 `app_token`。

1. 飞书云空间 → 「我的空间」 → 「新建」 → 「多维表格」（**不要点"知识库 → 添加文档 → 多维表格"那条路径**）
2. 命名（例：`招聘助手数据库`）
3. 在这个多维表格里新建 4 张数据表：`Candidate` / `Referral` / `Interview` / `JobDescription`
4. 字段（**必须与代码一致**，列名大小写也要严格一致）：

#### Candidate
| 字段名 | 类型 |
| --- | --- |
| candidateId | 文本 |
| name | 文本 |
| position | 文本 |
| phone | 文本 |
| email | 文本 |
| skills | 多选 |
| resumeSource | 单选（飞书机器人 / 内推 / 手动 / 邮件 / Boss直聘 / 猎聘 / 脉脉 / 猎头 / 校招 / 官网 / 其他） |
| resumeUrl | 文本 |
| status | 单选（待筛选 / 初筛通过 / 技术面 / HR面 / Offer / 入职 / 淘汰） |
| matchScore | 数字 |
| priority | 单选（高 / 中 / 低） |
| rejectReason | 多行文本（淘汰原因，看板填写后写入） |
| createdAt | 日期 |

#### Interview
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
| meetingUrl | 文本（飞书视频会议链接，看板创建后自动写入） |
| exceptionType | 单选（候选人爽约 / 面评超时 / 面试官取消 / 改期） |
| exceptionStatus | 单选（无 / 待处理 / 已处理） |
| escalationLevel | 数字（0~3，系统自动维护） |
| lastRemindedAt | 日期（上次提醒时间） |
| exceptionNote | 多行文本（异常说明，可选） |

#### Referral
| 字段名 | 类型 |
| --- | --- |
| candidateId | 文本 |
| candidateName | 文本 |
| referrerName | 文本 |
| referrerOpenId | 文本 |
| referralTime | 日期 |
| currentStatus | 文本 |

#### JobDescription
| 字段名 | 类型 |
| --- | --- |
| jobId | 文本 |
| position | 文本（需与候选人 `position` 一致或可模糊匹配，如「后端工程师」） |
| requirement | 多行文本（岗位要求，用于 AI 匹配打分） |
| headCount | 数字 |

> 候选人入库后会自动按 `position` 匹配 JD，写入 `matchScore`（技能契合度 0-100）和 `priority`（高/中/低）。**请至少维护一条与在招岗位对应的 JD 记录。**

### A6. 把应用加为多维表格协作者

打开多维表格 → 右上角「分享」/「协作者」→ 搜索你刚创建的应用名 → 添加为「可编辑」。

> **不做这一步，所有 Bitable API 调用都会返回 permission denied。这是最容易踩的坑。**

### A7. 记录 Bitable token 与 table id

打开多维表格，看浏览器 URL。**只接受 `/base/` 开头的格式：**

```
✅ 正确：https://xxx.feishu.cn/base/<APP_TOKEN>?table=<TABLE_ID>&view=...
❌ 错误：https://xxx.feishu.cn/wiki/<WIKI_NODE_TOKEN>?table=<TABLE_ID>&view=...
```

- `<APP_TOKEN>` → 对应 `.env` 里的 `FEISHU_BITABLE_APP_TOKEN`
- 切换到不同表格 tab，URL 里 `<TABLE_ID>` 会变 → 分别记下 4 张表的 ID，对应 `FEISHU_TABLE_CANDIDATE` / `_INTERVIEW` / `_REFERRAL` / `_JD`

> **如果你看到的是 `/wiki/` 开头的 URL**，说明你的多维表格建在了「知识库」里（A5 没按指引）。补救方案：
>
> - **最简单**：在「我的空间」重新建一个多维表格，把 4 张表重建一次（前期还没数据，代价小）
> - **不想重建**：把多维表格节点从知识库「移动」到「我的空间」（节点右上角"..." → 移动）
> - **完全不想动**：调一次飞书 API 把 wiki node token 翻译成 app_token：
>   ```bash
>   curl "https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token=<WIKI_NODE_TOKEN>" \
>     -H "Authorization: Bearer <tenant_access_token>"
>   # 响应里 data.node.obj_token 就是 app_token，data.node.obj_type 应为 "bitable"
>   ```
>   这个方案需要额外申请 `wiki:wiki:readonly` 权限。

---

## 阶段 B：服务器（部署服务，让 webhook URL 真实可用）

此时你已经有 A 阶段拿到的 9 个值：

```
FEISHU_APP_ID
FEISHU_APP_SECRET
FEISHU_VERIFICATION_TOKEN
FEISHU_ENCRYPT_KEY
FEISHU_BITABLE_APP_TOKEN
FEISHU_TABLE_CANDIDATE
FEISHU_TABLE_INTERVIEW
FEISHU_TABLE_REFERRAL
FEISHU_TABLE_JD
```

### B1. 准备 DeepSeek API Key

到 [https://platform.deepseek.com](https://platform.deepseek.com) 注册账号 → 充值（最少几块钱够调几千次）→ API Keys 页面新建一个。

### B2. 服务器拉代码 + 填 .env

```bash
git clone https://github.com/huanglixinccc/test-demo.git /opt/recruit-agent
cd /opt/recruit-agent
npm ci
cp .env.example .env
vim .env
```

填好阶段 A 拿到的 9 个值 + DeepSeek Key。`HR_OPEN_IDS` **先用占位符** `ou_placeholder`（后面 D 阶段再换成真实值）：

```env
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_VERIFICATION_TOKEN=xxx
FEISHU_ENCRYPT_KEY=xxx
FEISHU_BITABLE_APP_TOKEN=xxx
FEISHU_TABLE_CANDIDATE=tblxxx
FEISHU_TABLE_REFERRAL=tblxxx
FEISHU_TABLE_INTERVIEW=tblxxx
FEISHU_TABLE_JD=tblxxx
HR_OPEN_IDS=ou_placeholder
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
PORT=3000
LOG_LEVEL=info
```

### B3. 构建 + pm2 启动

```bash
npm run build
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
```

### B4. Nginx 反代 + SSL

参考 [`docs/deploy.md`](./deploy.md) 的 3、4 步。

### B5. 验证

在**任意**机器上访问：

```bash
curl https://<你的域名>/health
# 应返回 {"ok":true,"ts":...}
```

如果返回 `{"ok":true,...}` 就 OK，服务通了。**只有这一步通过才能进入阶段 C。**

---

## 阶段 C：飞书后台（回过头来配事件订阅 URL）

### C1. 填请求地址 + 勾选事件

回到飞书后台「事件与回调」 → 「事件订阅」：

- **请求地址**：`https://<你的域名>/webhook/feishu`
- 添加事件订阅：
  - `接收消息 v1.0`：`im.message.receive_v1`
  - `多维表格记录变更`：`drive.file.bitable_record_changed_v1`
  - `机器人自定义菜单`：`application.bot.menu_v6`
- **回调配置**（与事件订阅同一 URL）：
  - `卡片回传交互`：`card.action.trigger`
- 点「**保存**」 → 飞书会立刻发一个 URL Challenge 给你的 URL，服务里的 `/webhook/feishu` 会自动回应 → 显示「验证通过」

> 如果验证失败：
> - 检查 `pm2 logs recruit-agent --err` 看有没有报错
> - 确认 `FEISHU_ENCRYPT_KEY` 和后台显示的一致
> - 确认 `https://<域名>/health` 仍然可访问

---

## 阶段 D：抓真实 open_id，补全 .env

### D1. 让 HR 和面试官各给机器人发一句话

机器人在飞书里和应用同名。让 HR 账号、面试官账号分别和机器人私聊发一条消息（任意内容）。

### D2. 看日志拿 open_id

```bash
pm2 logs recruit-agent | grep botMessage.received
```

会看到类似：

```
{"openId":"ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","type":"text","msg":"botMessage.received"}
```

### D3. 更新 .env，重启

```bash
vim .env
# HR_OPEN_IDS=ou_hr1,ou_hr2   （多个用逗号分隔）
pm2 reload recruit-agent
```

把面试官的 open_id 填到 Bitable Interview 表 `interviewerOpenId` 字段（每条面试记录手动填）。

---

## 阶段 E：端到端 Demo 验证

按 `README.md` 末尾的"端到端 Demo 验证步骤" 6 步走一遍，看到：

- ✅ 私聊机器人发简历 → 收到入库卡片
- ✅ Bitable Candidate 表多一行
- ✅ Bitable Interview 表新建行 → 几秒内 `interviewStatus` 变 `待面试` + 面试官收到面试卡片
- ✅ 面试官填 `reviewResult` → 候选人 status 自动推进 + HR 收到汇总消息

就算 MVP 通过。

---

## 卡点速查

| 现象 | 在哪一阶段 | 排查 |
| --- | --- | --- |
| 多维表格 URL 是 `/wiki/` 开头不是 `/base/` | A5/A7 | 表建在知识库里了。重建到「我的空间」，或用 wiki API 翻译 token，详见 A7 |
| 看不到 Encrypt Key/Verification Token | A4 | 必须先点「开启加密策略」/「Verification Token」开关 |
| `/health` 返回 502/超时 | B5 | Nginx 没起 / pm2 没起 / 防火墙没开 443 |
| 飞书后台点保存说 URL 验证失败 | C1 | 看 `pm2 logs --err` → 大概率是 `FEISHU_ENCRYPT_KEY` 没填对 |
| 机器人收到消息但 Bitable 写不进 | E | 1) 应用没加多维表格协作者（A6 漏了）；或 2) `FEISHU_BITABLE_APP_TOKEN` 实际是 wiki node token（A7 没看清） |
| 面试官没收到面试通知 | E | Bitable Interview 行的 `interviewerOpenId` 字段没填，或 open_id 拼错 |
