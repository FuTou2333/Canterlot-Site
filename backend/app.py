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

@app.get("/api/links")
async def get_links(category: str = Query(None)):
    """Get links, optionally filtered by category."""
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
    """Get top links sorted by click count (hot ranking)."""
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
    """Return available categories, ordered by sort_order."""
    async with database.pg_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT key, label FROM categories ORDER BY sort_order"
        )
    return [{"key": row["key"], "label": row["label"]} for row in rows]


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
