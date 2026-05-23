# Canterlot-Site

**坎特洛特-交通枢纽的源码仓库，仅用于非商业用途。**

网址：[https://www.canterlot.site/mlp/](https://www.canterlot.site/mlp/)

坎城枢纽，小马相关网址导航站，由个人爱好者组建。

## 网站团队
- 开发：[Equescript](https://github.com/Equescript)、[FuTou2333](https://github.com/FuTou2333)
- 维护：[ShadowDumb](https://github.com/ShadowDumb)

> 欢迎在 Issues 补充网站、反馈问题或提出建议
>
> 本站时不时会修修补补，将来也计划添加一些新功能，如果您愿意帮忙开发，欢迎加入我们~

## Docker 部署

### 环境要求

- Docker 20.10+
- Docker Compose v2

### 快速启动

```bash
# 克隆仓库
git clone <repo-url> && cd Canterlot-Site

# 创建数据与日志目录
mkdir -p data/pgdata log/app

# 启动所有服务
docker compose up -d --build
```

服务启动后访问 `http://<服务器IP>`。

### 服务架构

| 服务 | 镜像 | 端口 | 说明 |
|---|---|---|---|
| postgres | postgres:16-alpine | 5432 | PostgreSQL 数据库，数据持久化到 `./data/pgdata` |
| redis | redis:7-alpine | 6379 | Redis 缓存，用于点击计数排序 |
| app | 本地构建 | 8000 | FastAPI 后端 + 静态文件服务 |
| nginx | nginxinc/nginx-unprivileged:alpine | 80→8080 | 反向代理，非 root 运行 |

### 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f app

# 重启单个服务（修改前端/后端代码后）
docker compose restart app

# 重新构建并启动（修改 Dockerfile 或 requirements.txt 后）
docker compose up -d --build

# 停止所有服务
docker compose down

# 完全清理（包括数据卷）
docker compose down -v
```

### 目录挂载

以下目录/文件在运行时挂载，修改后只需 `docker compose restart app`，无需重新构建：

| 宿主机路径 | 容器路径 | 说明 |
|---|---|---|
| `./backend/` | `/app/backend` | Python 后端代码 |
| `./index.html` | `/app/index.html` | 主页 |
| `./about.html` | `/app/about.html` | 关于页 |
| `./css/` | `/app/css` | 样式表 |
| `./js/` | `/app/js` | JavaScript |
| `./assets/` | `/app/assets` | 图标资源 |
| `./font/` | `/app/font` | 字体文件 |
| `./log/app/` | `/app/log` | 应用日志 |

### 数据库初始化

容器首次启动时自动执行 `python init_db.py`，从 `backend/seed_data.json` 导入种子数据。

手动重新导入（不删除现有数据）：

```bash
docker compose exec app python init_db.py --update
```

完全重置数据库：

```bash
docker compose down && rm -rf data/pgdata && docker compose up -d --build
```

### 环境变量

应用容器支持以下环境变量（在 `docker-compose.yml` 中配置）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PG_HOST` | postgres | PostgreSQL 主机 |
| `PG_PORT` | 5432 | PostgreSQL 端口 |
| `PG_DATABASE` | canterlot | 数据库名 |
| `PG_USER` | canterlot | 数据库用户 |
| `PG_PASSWORD` | canterlot | 数据库密码 |
| `REDIS_HOST` | redis | Redis 主机 |
| `REDIS_PORT` | 6379 | Redis 端口 |
| `REDIS_DB` | 0 | Redis 数据库编号 |

## 更多信息
本网站部分代码来自：[https://github.com/team-xc/right-click-menu](https://github.com/team-xc/right-click-menu)

网站图标：[https://www.deviantart.com/plainoasis/art/Canterlot-city-697785793](https://www.deviantart.com/plainoasis/art/Canterlot-city-697785793)

本网站使用了 HarmonyOS Sans 字体。

部分图标来自 iconfont。
