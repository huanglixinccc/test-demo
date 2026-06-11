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
  - `接收消息 v1.0`：`im.message.receive_v1`
  - `多维表格记录变更`：`drive.file.bitable_record_changed`

> 启用回调后飞书会立刻向你的 URL 发 URL Verification challenge。`/webhook/feishu` 已自动处理。

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
3. 字段（必须与代码一致，列名大小写也要一致）：

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

> **不做这一步，所有 API 调用会返回 permission denied。** 这是最容易踩的坑。

## 7. 记录 Bitable token 与 table id

打开多维表格，看浏览器 URL：

```
https://xxx.feishu.cn/base/<APP_TOKEN>?table=<TABLE_ID>&view=...
```

- `<APP_TOKEN>` → `FEISHU_BITABLE_APP_TOKEN`
- 每张表点开后 URL 中的 `<TABLE_ID>` → 分别对应 `FEISHU_TABLE_CANDIDATE` / `_INTERVIEW` / `_REFERRAL` / `_JD`

## 8. 拿到 HR 和面试官的 open_id

最简方式：

1. 把服务部署到云服务器并启动（见 `docs/deploy.md`）
2. `pm2 logs recruit-agent` 或临时 `LOG_LEVEL=debug npm start`
3. 让 HR 和面试官分别给机器人发一句话
4. 日志里会出现 `botMessage.received` + `openId: ou_xxxx`
5. 把这些 `ou_xxxx` 填入：
   - HR 的填 `.env` 的 `HR_OPEN_IDS`（多个逗号分隔）
   - 面试官的填到 Bitable Interview 表 `interviewerOpenId` 字段（每条面试记录手动填）

## 9. 验证

- `curl https://<你的域名>/health` → 返回 `{"ok":true,...}`
- 在飞书后台「事件订阅」页面点「验证」→ 返回成功
- 私聊机器人粘贴一段简历文本 → 应收到 "已收到，正在解析…" + 入库卡片
- 在 Bitable Interview 表新建一行填 `candidateId` / `interviewerOpenId` / `interviewTime` → 几秒内面试官应收到面试通知卡片
