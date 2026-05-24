"""数据库连接池与初始化。"""
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
    "password": os.environ.get("PG_PASSWORD"),
}
if not DB_CONFIG["password"]:
    raise RuntimeError("缺少 PG_PASSWORD 环境变量")

REDIS_CONFIG = {
    "host": os.getenv("REDIS_HOST", "127.0.0.1"),
    "port": int(os.getenv("REDIS_PORT", "6379")),
    "db": int(os.getenv("REDIS_DB", "0")),
    "decode_responses": True,
}
if os.getenv("REDIS_PASSWORD"):
    REDIS_CONFIG["password"] = os.environ.get("REDIS_PASSWORD")


SCHEMA_SQL = """
    CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT './assets/website.png',
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

    CREATE TABLE IF NOT EXISTS categories (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS link_categories (
        link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        PRIMARY KEY (link_id, category)
    );

    -- 将旧的单分类数据迁移到关联表
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'links' AND column_name = 'category'
        ) THEN
            INSERT INTO link_categories (link_id, category)
            SELECT id, category FROM links WHERE category IS NOT NULL
            ON CONFLICT DO NOTHING;

            ALTER TABLE links DROP COLUMN category;
        END IF;
    END $$;

    -- 确保引用的分类在添加外键前已存在
    INSERT INTO categories (key, label)
    SELECT DISTINCT category, category FROM link_categories
    WHERE category NOT IN (SELECT key FROM categories)
    ON CONFLICT DO NOTHING;

    -- 添加 link_categories 到 categories 的外键（如不存在）
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'link_categories_category_fkey'
        ) THEN
            ALTER TABLE link_categories
            ADD CONSTRAINT link_categories_category_fkey
            FOREIGN KEY (category) REFERENCES categories(key) ON DELETE CASCADE;
        END IF;
    END $$;

    DROP INDEX IF EXISTS idx_links_category;
    CREATE INDEX IF NOT EXISTS idx_link_categories_category ON link_categories(category);
    CREATE INDEX IF NOT EXISTS idx_links_click_count ON links(click_count DESC);
    CREATE INDEX IF NOT EXISTS idx_links_last_clicked ON links(click_count DESC, last_clicked_at DESC NULLS LAST);

    CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        ip_address TEXT NOT NULL,
        is_new_visitor BOOLEAN NOT NULL DEFAULT FALSE,
        visited_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_visits_ip_visited ON visits(ip_address, visited_at DESC);
    CREATE INDEX IF NOT EXISTS idx_visits_new_visitor ON visits(is_new_visitor) WHERE is_new_visitor = TRUE;
"""


async def init_pg():
    global pg_pool
    pg_pool = await asyncpg.create_pool(**DB_CONFIG)


async def run_migrations():
    if pg_pool is None:
        raise RuntimeError("数据库连接池未初始化，请先调用 init_pg()")
    async with pg_pool.acquire() as conn:
        await conn.execute(SCHEMA_SQL)


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
