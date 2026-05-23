"""Canterlot Site backend — FastAPI + PostgreSQL + Redis."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

import database

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "..")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.init_pg()
    await database.init_redis()
    yield
    await database.close_redis()
    await database.close_pg()


app = FastAPI(lifespan=lifespan, title="Canterlot Site API")

CATEGORY_LABELS = {
    "news": "资讯",
    "community": "社区",
    "video": "视频",
    "game": "游戏",
    "tool": "工具",
    "music": "音乐",
    "image": "图片",
    "fiction": "小说",
    "comic": "漫画",
    "wiki": "维基",
    "merch": "周边",
    "resource": "资源",
}


@app.get("/api/links")
async def get_links(category: str = Query(None)):
    """Get links, optionally filtered by category."""
    async with database.pg_pool.acquire() as conn:
        if category:
            rows = await conn.fetch(
                "SELECT id, url, title, description, icon, category, click_count "
                "FROM links WHERE category = $1 ORDER BY id",
                category,
            )
        else:
            rows = await conn.fetch(
                "SELECT id, url, title, description, icon, category, click_count "
                "FROM links ORDER BY category, id"
            )

    return [
        {
            "id": row["id"],
            "url": row["url"],
            "title": row["title"],
            "description": row["description"],
            "icon": row["icon"],
            "category": row["category"],
            "click_count": row["click_count"],
        }
        for row in rows
    ]


@app.get("/api/links/hot")
async def get_hot_links(limit: int = Query(default=20, le=50)):
    """Get top links sorted by click count (hot ranking)."""
    async with database.pg_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, url, title, description, icon, category, click_count "
            "FROM links ORDER BY click_count DESC, last_clicked_at DESC NULLS LAST, id ASC LIMIT $1",
            limit,
        )

    return [
        {
            "id": row["id"],
            "url": row["url"],
            "title": row["title"],
            "description": row["description"],
            "icon": row["icon"],
            "category": row["category"],
            "click_count": row["click_count"],
        }
        for row in rows
    ]


@app.post("/api/links/{link_id}/click")
async def record_click(link_id: int):
    """Record a click on a link. Increments both PG and Redis."""
    async with database.pg_pool.acquire() as conn:
        result = await conn.fetchrow(
            "UPDATE links SET click_count = click_count + 1, last_clicked_at = NOW() "
            "WHERE id = $1 RETURNING click_count",
            link_id,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Link not found")

        new_count = result["click_count"]

    # Increment Redis sorted set for hot ranking
    await database.redis_client.zincrby("canterlot:clicks", 1, str(link_id))

    return {"id": link_id, "click_count": new_count}


@app.get("/api/categories")
async def get_categories():
    """Return available categories."""
    return [
        {"key": k, "label": v} for k, v in CATEGORY_LABELS.items()
    ]


# Serve static files (HTML, CSS, JS, assets)
@app.get("/")
async def root():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/about.html")
async def about():
    return FileResponse(os.path.join(STATIC_DIR, "about.html"))


# Mount static directories
app.mount("/css", StaticFiles(directory=os.path.join(STATIC_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(STATIC_DIR, "js")), name="js")
app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
app.mount("/font", StaticFiles(directory=os.path.join(STATIC_DIR, "font")), name="font")
