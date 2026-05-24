"""坎特洛特站点后端 — FastAPI + PostgreSQL + Redis。"""

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import time

import database

VISITOR_COOLDOWN = timedelta(minutes=30)

# 简单的内存速率限制器：{key: [timestamps]}
# 注意：仅限单 worker；多 worker 部署请使用 Redis
_rate_limit_window = 10   # 秒
_rate_limit_max = 20      # 每个窗口最大请求数
_rate_buckets: dict[str, list[float]] = {}
_last_cleanup = time.time()
_cleanup_interval = 300   # 每 5 分钟清理过期键


def _check_rate_limit(key: str) -> bool:
    global _last_cleanup
    now = time.time()

    # 定期清理过期键，防止无限增长（只删除完全过期的键，保留有效计数）
    if now - _last_cleanup > _cleanup_interval:
        expired = [
            k for k, v in _rate_buckets.items()
            if all(now - t > _rate_limit_window for t in v)
        ]
        for k in expired:
            del _rate_buckets[k]
        _last_cleanup = now

    bucket = _rate_buckets.get(key, [])
    bucket = [t for t in bucket if now - t < _rate_limit_window]
    if len(bucket) >= _rate_limit_max:
        _rate_buckets[key] = bucket
        return False
    bucket.append(now)
    _rate_buckets[key] = bucket
    return True

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "..")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.init_pg()
    await database.run_migrations()
    await database.init_redis()
    yield
    await database.close_redis()
    await database.close_pg()


app = FastAPI(lifespan=lifespan, title="Canterlot Site API")

@app.get("/api/links")
async def get_links(category: str = Query(None)):
    """获取链接列表，可按分类筛选。"""
    async with database.pg_pool.acquire() as conn:
        if category:
            rows = await conn.fetch(
                "SELECT l.id, l.url, l.title, l.description, l.icon, l.click_count, "
                "COALESCE(array_agg(lc_all.category) FILTER (WHERE lc_all.category IS NOT NULL), '{}') AS categories "
                "FROM links l "
                "JOIN link_categories lc ON l.id = lc.link_id "
                "LEFT JOIN link_categories lc_all ON l.id = lc_all.link_id "
                "WHERE lc.category = $1 "
                "GROUP BY l.id "
                "ORDER BY l.click_count DESC, l.id ASC",
                category,
            )
        else:
            rows = await conn.fetch(
                "SELECT l.id, l.url, l.title, l.description, l.icon, l.click_count, "
                "COALESCE(array_agg(lc.category) FILTER (WHERE lc.category IS NOT NULL), '{}') AS categories "
                "FROM links l "
                "LEFT JOIN link_categories lc ON l.id = lc.link_id "
                "GROUP BY l.id "
                "ORDER BY l.click_count DESC, l.id ASC"
            )

    return [
        {
            "id": row["id"],
            "url": row["url"],
            "title": row["title"],
            "description": row["description"],
            "icon": row["icon"],
            "categories": row["categories"],
            "click_count": row["click_count"],
        }
        for row in rows
    ]


@app.get("/api/links/hot")
async def get_hot_links(limit: int = Query(default=20, le=50)):
    """获取点击量最高的链接（热点排行）。"""
    async with database.pg_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT l.id, l.url, l.title, l.description, l.icon, l.click_count, "
            "COALESCE(array_agg(lc.category) FILTER (WHERE lc.category IS NOT NULL), '{}') AS categories "
            "FROM links l "
            "LEFT JOIN link_categories lc ON l.id = lc.link_id "
            "GROUP BY l.id "
            "ORDER BY l.click_count DESC, l.last_clicked_at DESC NULLS LAST, l.id ASC LIMIT $1",
            limit,
        )

    return [
        {
            "id": row["id"],
            "url": row["url"],
            "title": row["title"],
            "description": row["description"],
            "icon": row["icon"],
            "categories": row["categories"],
            "click_count": row["click_count"],
        }
        for row in rows
    ]


@app.post("/api/links/{link_id}/click")
async def record_click(link_id: int, request: Request):
    """记录链接点击，同时更新 PostgreSQL 和 Redis。"""
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"rate:click:{client_ip}"
    if not _check_rate_limit(rate_key):
        raise HTTPException(status_code=429, detail="Too many requests")

    async with database.pg_pool.acquire() as conn:
        result = await conn.fetchrow(
            "UPDATE links SET click_count = click_count + 1, last_clicked_at = NOW() "
            "WHERE id = $1 RETURNING click_count",
            link_id,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Link not found")

        new_count = result["click_count"]

    # 更新 Redis 有序集合，用于热点排行
    await database.redis_client.zincrby("canterlot:clicks", 1, str(link_id))

    return {"id": link_id, "click_count": new_count}


@app.get("/api/categories")
async def get_categories():
    """返回可用分类列表，按排序字段排列。"""
    async with database.pg_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT key, label FROM categories ORDER BY sort_order"
        )
    return [{"key": row["key"], "label": row["label"]} for row in rows]


@app.post("/api/visit")
async def record_visit(request: Request):
    """记录页面访问，返回总页面浏览量和独立访问次数。"""
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"rate:visit:{client_ip}"
    if not _check_rate_limit(rate_key):
        raise HTTPException(status_code=429, detail="Too many requests")
    now = datetime.now(timezone.utc)

    async with database.pg_pool.acquire() as conn:
        last_visit = await conn.fetchval(
            "SELECT MAX(visited_at) FROM visits WHERE ip_address = $1", client_ip
        )
        is_new = True
        if last_visit and (now - last_visit) < VISITOR_COOLDOWN:
            is_new = False

        await conn.execute(
            "INSERT INTO visits (ip_address, is_new_visitor, visited_at) VALUES ($1, $2, $3)",
            client_ip, is_new, now,
        )

        page_views = await conn.fetchval("SELECT COUNT(*) FROM visits")
        new_visits = await conn.fetchval("SELECT COUNT(*) FROM visits WHERE is_new_visitor = TRUE")

    return {"page_views": page_views, "visitors": new_visits}


@app.get("/api/stats")
async def get_stats():
    """获取站点统计数据（页面浏览量和独立访问次数），不记录访问。"""
    async with database.pg_pool.acquire() as conn:
        page_views = await conn.fetchval("SELECT COUNT(*) FROM visits")
        new_visits = await conn.fetchval("SELECT COUNT(*) FROM visits WHERE is_new_visitor = TRUE")
    return {"page_views": page_views, "visitors": new_visits}


# 提供静态文件（HTML、CSS、JS、资源文件）
@app.get("/")
async def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/about.html")
async def about():
    return FileResponse(os.path.join(STATIC_DIR, "about.html"))


# 挂载静态文件目录
app.mount("/css", StaticFiles(directory=os.path.join(STATIC_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(STATIC_DIR, "js")), name="js")
app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
app.mount("/font", StaticFiles(directory=os.path.join(STATIC_DIR, "font")), name="font")
