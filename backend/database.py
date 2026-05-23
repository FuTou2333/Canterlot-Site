"""Database connection pool and initialization."""
import os
import asyncpg
import redis.asyncio as redis

pg_pool: asyncpg.Pool = None
redis_client: redis.Redis = None

DB_CONFIG = {
    "host": os.getenv("PG_HOST", "127.0.0.1"),
    "port": int(os.getenv("PG_PORT", "5432")),
    "database": os.getenv("PG_DATABASE", "canterlot"),
    "user": os.getenv("PG_USER", "canterlot"),
    "password": os.getenv("PG_PASSWORD", "canterlot"),
}

REDIS_CONFIG = {
    "host": os.getenv("REDIS_HOST", "127.0.0.1"),
    "port": int(os.getenv("REDIS_PORT", "6379")),
    "db": int(os.getenv("REDIS_DB", "0")),
    "decode_responses": True,
}


async def init_pg():
    global pg_pool
    pg_pool = await asyncpg.create_pool(**DB_CONFIG)
    async with pg_pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS links (
                id SERIAL PRIMARY KEY,
                url TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                icon TEXT NOT NULL DEFAULT './assets/website.png',
                category TEXT NOT NULL,
                click_count INTEGER NOT NULL DEFAULT 0,
                last_clicked_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            ALTER TABLE links ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMPTZ;
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'links_url_key'
                ) THEN
                    ALTER TABLE links ADD CONSTRAINT links_url_key UNIQUE (url);
                END IF;
            END $$;
            CREATE INDEX IF NOT EXISTS idx_links_category ON links(category);
            CREATE INDEX IF NOT EXISTS idx_links_click_count ON links(click_count DESC);
            CREATE INDEX IF NOT EXISTS idx_links_last_clicked ON links(click_count DESC, last_clicked_at DESC NULLS LAST);
        """)


async def init_redis():
    global redis_client
    redis_client = redis.Redis(**REDIS_CONFIG)


async def close_pg():
    global pg_pool
    if pg_pool:
        await pg_pool.close()


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.aclose()
