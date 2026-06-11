# 部署指南

## 环境
- Node.js 18+
- pm2（`npm i -g pm2`）
- Nginx
- 一个解析到本机的域名（例：`recruit.example.com`）
- Let's Encrypt（acme.sh）

## 与已有 Node 服务共存

如果你的服务器上已经跑着别的 Node 服务（NestJS / Express 等），**不会冲突**，只需避开以下三类资源：

### 0.1 端口
```bash
sudo lsof -i :3000      # 默认端口是否被占
ss -tlnp | grep :3000
```
- **被占** → 改 `.env` 里 `PORT=3100`（或其它空闲端口），Nginx `proxy_pass` 同步改成 `http://127.0.0.1:3100`
- **没占** → 默认 3000 即可

### 0.2 域名 / Nginx
**强烈推荐**：给 recruit-agent 单独申请一个**子域名**（如 `recruit.example.com`），新增独立 server block，**不要**改你已有服务的 Nginx 配置。

不要做的事：把 recruit-agent 挂在已有域名的 path 下（例如 `api.example.com/recruit/*`）。原因：
- 飞书事件订阅 URL 是固定路径 `/webhook/feishu`，path 前缀复用会改变路径
- 已有 server 的 `client_max_body_size`、CORS、header 处理可能干扰飞书加密 payload

### 0.3 PM2 进程名
```bash
pm2 list
```
默认 `name: "recruit-agent"`，正常不会和你的 NestJS 重名。重名了改 `ecosystem.config.cjs` 的 `name` 即可。

### 0.4 Node 版本不一致
如果已有服务在 Node 16 或更老版本上，装 [`nvm`](https://github.com/nvm-sh/nvm) 同时管两个版本，在 `ecosystem.config.cjs` 里指定 interpreter：

```js
module.exports = {
  apps: [{
    name: "recruit-agent",
    script: "dist/app.js",
    interpreter: "/home/<user>/.nvm/versions/node/v18.20.4/bin/node",
    // ... 其它配置不变
  }]
}
```

### 0.5 目录隔离
部署到独立目录（例 `/opt/recruit-agent`），不要和已有服务复用代码目录、日志目录、`.env`。

---

## 部署步骤

### 1. 拉代码 + 安装 + 构建

```bash
git clone <repo> /opt/recruit-agent
cd /opt/recruit-agent
npm ci
cp .env.example .env
# 编辑 .env 填入所有变量（参见 docs/feishu-setup.md）
npm run build
mkdir -p logs
```

### 2. pm2 启动

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # 跟随系统启动，按提示再执行一遍输出的命令
```

### 3. Nginx 反代

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

```bash
nginx -t && systemctl reload nginx
```

### 4. SSL（acme.sh + Let's Encrypt）

```bash
curl https://get.acme.sh | sh
~/.acme.sh/acme.sh --issue -d recruit.example.com --nginx
~/.acme.sh/acme.sh --install-cert -d recruit.example.com \
  --key-file /etc/letsencrypt/live/recruit.example.com/privkey.pem \
  --fullchain-file /etc/letsencrypt/live/recruit.example.com/fullchain.pem \
  --reloadcmd "systemctl reload nginx"
```

### 5. 验证

```bash
curl https://recruit.example.com/health
# {"ok":true,"ts":...}
```

### 6. 更新部署

```bash
cd /opt/recruit-agent
git pull
npm ci
npm run build
pm2 reload recruit-agent
```

## 排错

| 现象 | 排查 |
| --- | --- |
| `pm2` 启动后立刻 errored | `pm2 logs recruit-agent --err`，常见原因：`.env` 缺变量 → 服务启动时抛 `Missing env var` |
| 飞书事件订阅页面「验证」失败 | 1) 检查域名是 HTTPS；2) `pm2 logs` 看是否真有请求到达；3) `FEISHU_ENCRYPT_KEY` 是否与后台一致 |
| 机器人不回消息 | 1) Bot 是否启用；2) 应用权限是否审批；3) `LOG_LEVEL=debug` 重启看是否收到 `botMessage.received` |
| Bitable API permission denied | 应用没被加为多维表格协作者（最常见） |
| 写表时字段类型不匹配 | Bitable 表字段类型与 `docs/feishu-setup.md` §5 必须严格一致 |
