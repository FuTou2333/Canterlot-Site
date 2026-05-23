# Canterlot Site 维护指南

## 目录结构

```
Canterlot-Site/
├── backend/
│   ├── app.py                 # FastAPI 后端入口
│   ├── database.py            # 数据库连接与建表
│   ├── init_db.py             # 数据初始化与导入脚本
│   ├── export_data.py         # 数据导出为 SQL 文件
│   ├── import_data.py         # 从 SQL 文件恢复数据
│   ├── entrypoint.sh          # 容器启动入口
│   ├── requirements.txt       # Python 依赖
│   ├── nginx-docker.conf      # Nginx 反向代理配置
│   ├── seed_data.json         # 链接种子数据
│   └── categories.json        # 分类定义
├── assets/                    # 图标资源（favicon、站点图标）
├── css/                       # 样式表
├── js/                        # JavaScript
├── font/                      # 字体文件
├── index.html                 # 主页
├── about.html                 # 关于页
├── Dockerfile
├── docker-compose.yml
└── data/pgdata/               # 数据库持久化数据（不提交到 Git）
```

## 添加新链接

编辑 `backend/seed_data.json`，在数组末尾添加一条记录：

```json
{
  "url": "https://example.com/",
  "title": "站点名称",
  "description": "一句话介绍",
  "icon": "./assets/example.png",
  "categories": ["news"]
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `url` | string | 完整 URL，包含 `https://` |
| `title` | string | 站点名称，显示为卡片标题 |
| `description` | string | 一句话简介，显示为卡片副标题 |
| `icon` | string | 图标路径，相对于仓库根目录。新图标放入 `assets/`，路径写 `./assets/xxx.png` |
| `categories` | string[] | 分类数组，一个链接可归属多个分类。可用值见 `backend/categories.json` |

## 修改已有链接

直接编辑 `backend/seed_data.json` 中对应条目的字段，然后以 `--update` 模式导入：

```bash
docker compose exec app python init_db.py --update
```

`--update` 模式的行为：
- 已存在的 `url` → 更新 title、description、icon，并**重置** categories（先删后插）
- 新 `url` → 直接插入
- **不会删除** seed_data.json 中不存在的链接

## 添加新分类

**步骤 1**：编辑 `backend/categories.json`，在数组末尾添加：

```json
{"key": "newcat", "label": "新分类", "sort_order": 13}
```

`sort_order` 控制分类按钮的显示顺序，数字小的靠前。

**步骤 2**：导入分类：

```bash
docker compose exec app python init_db.py --update
```

**步骤 3**：重启应用使前端加载新分类：

```bash
docker compose restart app
```

> 分类按钮由前端从 `/api/categories` 动态获取，添加后自动出现在页面上。无需修改 HTML 或 JS 代码。

## 修改/重排分类

- **改名**：修改 `categories.json` 中对应条目的 `label`，然后 `--update`
- **调整顺序**：修改 `sort_order` 值，然后 `--update`
- **删除分类**：从 `categories.json` 移除，然后执行：
  ```bash
  docker compose exec app python init_db.py --update
  ```
  > 注意：`--update` 不会自动删除已从配置文件移除的分类。需手动进数据库删除（未被任何链接引用时）：
  ```bash
  docker compose exec postgres psql -U canterlot -d canterlot -c "DELETE FROM categories WHERE key='xxx';"
  ```

## 更换/添加图标

图标文件存放在 `assets/` 目录。

**更换已有站点的图标**：
1. 将新图标文件放入 `assets/`（建议 64×64 以下的 png/ico/svg）
2. 在 `seed_data.json` 中更新对应条目的 `icon` 路径
3. 执行 `docker compose exec app python init_db.py --update`

**图标文件建议**：
- 格式：PNG、ICO、SVG
- 尺寸：建议 40×40 或正方形，页面渲染为 40×40
- 命名：小写英文，无空格

## 应用更改

所有对 `seed_data.json` 或 `categories.json` 的修改都需要导入数据库才能生效。

**仅新增或修改数据**（推荐，保留现有数据）：

```bash
docker compose exec app python init_db.py --update
```

**完全重建**（清空数据库，从零导入）：

```bash
docker compose down && rm -rf data/pgdata && docker compose up -d --build
```

## 数据备份与恢复

### 导出备份

将数据库中的全部数据导出为 SQL 文件：

```bash
# 完整导出（含点击量、时间戳）
docker compose exec -T app python export_data.py > backup_$(date +%Y%m%d).sql

# 仅导出结构数据（不含点击量，适合版本控制）
docker compose exec -T app python export_data.py --no-click-count > backup.sql
```

导出的 SQL 文件包含三类数据：
- **categories** — 分类定义（key、名称、排序）
- **links** — 链接数据（URL、标题、描述、图标、点击量、时间戳）
- **link_categories** — 链接与分类的对应关系

所有 INSERT 语句使用 `ON CONFLICT` 语法，导入时自动处理重复数据。

### 恢复数据

从导出的 SQL 文件恢复数据库：

```bash
# 导入（在事务中执行，失败自动回滚）
docker compose exec -T app python import_data.py - < backup.sql

# 先验证再导入
docker compose exec -T app python import_data.py --dry-run - < backup.sql
```

导入行为：
- **categories** — 分类 key 已存在时更新 label 和 sort_order，不存在则插入
- **links** — 链接 id 已存在时更新所有字段，不存在则插入
- **link_categories** — 已存在则跳过
- 全部操作在一个事务中完成，任何错误都会回滚，不会留下部分写入

### 定期备份建议

建议定期（例如每周）将导出的 SQL 文件保存到安全位置：

```bash
# 定时备份示例（crontab）
0 3 * * 0 cd /path/to/Canterlot-Site && docker compose exec -T app python export_data.py > backups/backup_$(date +\%Y\%m\%d).sql
```

备份文件可安全提交到 Git（使用 `--no-click-count` 排除易变的点击量数据），便于追踪链接和分类的变更历史。

## 日常运维命令

```bash
# 查看所有容器状态
docker compose ps

# 查看应用日志（实时跟踪）
docker compose logs -f app

# 查看 Nginx 日志
docker compose logs -f nginx

# 重启应用（修改前端后）
docker compose restart app

# 重新构建并启动（修改 Dockerfile 或 requirements.txt 后）
docker compose up -d --build

# 停止所有服务
docker compose down

# 进入数据库
docker compose exec postgres psql -U canterlot -d canterlot
```

## 在线修改（不重启容器）

以下修改无需运行 `--update`，只需 `docker compose restart app`：

| 修改内容 | 影响范围 |
|---|---|
| `index.html`、`about.html` | 页面结构 |
| `css/*.css` | 样式 |
| `js/*.js` | 交互逻辑 |
| `assets/` 中的文件 | 图标资源 |

## 注意事项

- `seed_data.json` 中的 `url` 字段是唯一键，导入时按 URL 去重
- `categories` 数组中的值必须是 `categories.json` 中已定义的 key（数据库有外键约束）
- 图标 `./assets/website.png` 是默认图标，找不到图标时前端会自动回退
- "热点"是前端特殊处理的内置分类，不出现在 `categories.json` 中
- 移动端适配断点为 600px，修改 CSS 时注意 `@media (max-width: 600px)` 规则
