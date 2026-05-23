# HTTPS 与 CDN 部署指南

当前站点使用 nginx 反向代理对外暴露 80 端口（HTTP）。下面两个方案分别实现 HTTPS 和 CDN。

---

## 方案一：CloudFlare（推荐，HTTPS + CDN 一步到位）

**优点**：免费、零 Docker 配置变更、自带全球 CDN、DDoS 防护、自动续签证书。

### 1. 域名接入 CloudFlare

1. 在 [CloudFlare](https://www.cloudflare.com/) 注册账号
2. 添加站点 `canterlot.site`
3. 按指引到域名注册商处修改 NS 记录，指向 CloudFlare 分配的 NS 服务器

### 2. DNS 解析设置

NS 生效后，在 CloudFlare DNS 面板添加记录：

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| A | `www` | 你的服务器公网 IP | 已代理（橙色云朵） |
| A | `@` | 你的服务器公网 IP | 已代理（橙色云朵） |

### 3. SSL/TLS 模式

进入 **SSL/TLS** → **概述**，选择加密模式：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **Flexible** | 客户端 ↔ CloudFlare 加密，CloudFlare ↔ 服务器 HTTP | 最简单，不改现有 nginx |
| **Full** | 全程加密，CloudFlare 信任自签证书 | nginx 配了自签证书 |
| **Full (strict)** | 全程加密，CloudFlare 验证证书有效性 | nginx 配了正规证书 |

选 **Flexible** 即可零改动直接使用。

### 4. CDN 缓存规则

进入 **规则** → **Cache Rules**，添加以下规则：

| 规则 | URI 路径 | 缓存设置 |
|------|----------|----------|
| 静态资源 | `/assets/*` | Edge TTL: 30 天，Browser TTL: 7 天 |
| 样式 | `/css/*` | Edge TTL: 7 天，Browser TTL: 1 天 |
| 脚本 | `/js/*` | Edge TTL: 7 天，Browser TTL: 1 天 |
| 字体 | `/font/*` | Edge TTL: 30 天，Browser TTL: 7 天 |
| HTML | `*.html` | 不缓存（Bypass cache） |

### 5. （可选）原站 IP 保护

修改 `backend/nginx-docker.conf`，只允许 CloudFlare IP 访问。CloudFlare IP 列表见 https://www.cloudflare.com/ips-v4/ 和 https://www.cloudflare.com/ips-v6/。

### 6. 验证

```bash
# 确认 HTTPS 生效
curl -I https://www.canterlot.site/mlp/

# 确认 CDN 命中（看 cf-cache-status 头）
curl -I https://www.canterlot.site/assets/website.png
```

---

## 方案二：Docker + Let's Encrypt（完全自管）

**优点**：不依赖第三方平台，完全自管。**缺点**：需改 Docker 配置，无 CDN（需另配）。

### 1. 创建证书目录

```bash
mkdir -p certbot/conf certbot/www
```

### 2. docker-compose.yml 修改

在 `services` 下新增 certbot 服务，并修改 nginx 端口和挂载：

```yaml
services:
  # ... postgres, redis, app 不变 ...

  certbot:
    image: certbot/certbot:latest
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
    networks:
      - canterlot
    deploy:
      resources:
        limits:
          memory: 64M
          cpus: "0.25"

  nginx:
    image: nginxinc/nginx-unprivileged:alpine
    ports:
      - "80:8080"
      - "443:8443"
    volumes:
      - ./backend/nginx-docker.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      app:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "kill", "-0", "1"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 5s
    restart: unless-stopped
    networks:
      - canterlot
    deploy:
      resources:
        limits:
          memory: 64M
          cpus: "0.25"
        reservations:
          memory: 16M
          cpus: "0.1"
```

### 3. nginx-docker.conf 改为 HTTPS

```nginx
resolver 127.0.0.11 valid=10s ipv6=off;

# HTTP → HTTPS 重定向
server {
    listen 8080;
    server_name www.canterlot.site canterlot.site;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 8443 ssl;
    http2 on;
    server_name www.canterlot.site canterlot.site;

    ssl_certificate     /etc/letsencrypt/live/www.canterlot.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.canterlot.site/privkey.pem;

    # 安全加固
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    client_max_body_size 10m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    location / {
        set $upstream app:8000;
        proxy_pass http://$upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 4. 首次申请证书

```bash
# 先启动所有服务
docker compose up -d

# 测试申请（dry-run，不会消耗速率限制）
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your@email.com \
  --agree-tos --no-eff-email \
  -d www.canterlot.site -d canterlot.site \
  --dry-run

# 正式申请（去掉 --dry-run）
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your@email.com \
  --agree-tos --no-eff-email \
  -d www.canterlot.site -d canterlot.site

# 重载 nginx 使证书生效
docker compose restart nginx
```

### 5. 自动续签

certbot 容器每 12 小时执行一次 `certbot renew`，证书到期前自动续签。续签后需重载 nginx。可优化 certbot 的 entrypoint：

```yaml
entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew --deploy-hook=\"nginx -s reload\"; sleep 12h & wait $${!}; done;'"
```

---

## 方案对比

| | CloudFlare | Let's Encrypt |
|---|---|---|
| 配置量 | 低（DNS 操作） | 中（改 Docker + nginx 配置） |
| HTTPS | 自动 | 需设置续签 |
| CDN | 自带全球 CDN | 无，需另配 CDN 服务 |
| 依赖 | CloudFlare 平台 | 无外部依赖 |
| 费用 | 免费 | 免费 |
| 运维 | 几乎无 | 需关注证书状态 |
| 推荐 | 大多数场景 | 需要完全掌控或无法使用 CloudFlare |

对于本项目，**CloudFlare 是最省心的选择**：改一下 DNS 就同时解决了 HTTPS 和 CDN，不用动任何代码或 Docker 配置。
