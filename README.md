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

# 创建数据目录
mkdir -p data/pgdata

# 创建环境变量配置文件（务必修改 PG_PASSWORD 为强密码）
cp .env.example .env

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

### 数据备份与恢复

```bash
# 导出数据库为 SQL 文件（包含分类、链接、点击量）
docker compose exec -T app python export_data.py > backup.sql

# 导出不含点击量数据（仅结构和元数据）
docker compose exec -T app python export_data.py --no-click-count > backup.sql

# 恢复数据（导入 SQL 文件）
docker compose exec -T app python import_data.py - < backup.sql

# 验证 SQL 文件格式（不实际执行）
docker compose exec -T app python import_data.py --dry-run - < backup.sql
```

导入操作在单个事务中执行，失败时自动回滚，不会损坏现有数据。

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

### 数据库初始化

容器首次启动时自动执行 `python init_db.py`，导入两类数据：

| 配置文件 | 对应表 | 说明 |
|---|---|---|
| `backend/categories.json` | `categories` | 导航分类定义（key、名称、排序） |
| `backend/seed_data.json` | `links` + `link_categories` | 链接数据（标题、URL、图标、分类） |

手动增量更新（只新增/更新变化的部分，不删除现有数据）：

```bash
docker compose exec app python init_db.py --update
```

完全重置数据库：

```bash
docker compose down && rm -rf data/pgdata && docker compose up -d --build
```

### 环境变量

所有配置通过 `.env` 文件管理。模板文件为 `.env.example`，首次部署时复制并修改：

```bash
cp .env.example .env
```

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

修改变量后需重启服务生效：

```bash
docker compose down && docker compose up -d
```

## 更多信息
本网站部分代码来自：[https://github.com/team-xc/right-click-menu](https://github.com/team-xc/right-click-menu)

网站图标：[https://www.deviantart.com/plainoasis/art/Canterlot-city-697785793](https://www.deviantart.com/plainoasis/art/Canterlot-city-697785793)

本网站使用了 HarmonyOS Sans 字体。

部分图标来自 iconfont。
