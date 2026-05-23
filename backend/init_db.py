"""Initialize the database and import seed data.

Usage:
    python init_db.py              # create tables + import seed
    python init_db.py --drop       # drop tables first, then create + import
"""

import asyncio
import asyncpg
import json
import os
import sys

DB_CONFIG = {
    "host": os.getenv("PG_HOST", "127.0.0.1"),
    "port": int(os.getenv("PG_PORT", "5432")),
    "database": os.getenv("PG_DATABASE", "canterlot"),
    "user": os.getenv("PG_USER", "canterlot"),
    "password": os.getenv("PG_PASSWORD", "canterlot"),
}

SEED_FILE = os.path.join(os.path.dirname(__file__), "seed_data.json")
CATEGORIES_FILE = os.path.join(os.path.dirname(__file__), "categories.json")

CREATE_TABLE_SQL = """
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
CREATE INDEX IF NOT EXISTS idx_link_categories_category ON link_categories(category);
CREATE INDEX IF NOT EXISTS idx_links_click_count ON links(click_count DESC);
CREATE INDEX IF NOT EXISTS idx_links_last_clicked ON links(click_count DESC, last_clicked_at DESC NULLS LAST);
"""

DROP_TABLE_SQL = "DROP TABLE IF EXISTS links CASCADE; DROP TABLE IF EXISTS categories CASCADE;"


async def main():
    drop_first = "--drop" in sys.argv

    conn = await asyncpg.connect(**DB_CONFIG)

    if drop_first:
        print("Dropping existing tables...")
        await conn.execute(DROP_TABLE_SQL)

    print("Creating tables...")
    await conn.execute(CREATE_TABLE_SQL)

    update_mode = "--update" in sys.argv

    # Seed categories
    with open(CATEGORIES_FILE, "r", encoding="utf-8") as f:
        categories = json.load(f)

    for cat in categories:
        if update_mode:
            await conn.execute(
                "INSERT INTO categories (key, label, sort_order) VALUES ($1, $2, $3) "
                "ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order",
                cat["key"], cat["label"], cat["sort_order"],
            )
        else:
            await conn.execute(
                "INSERT INTO categories (key, label, sort_order) VALUES ($1, $2, $3) "
                "ON CONFLICT (key) DO NOTHING",
                cat["key"], cat["label"], cat["sort_order"],
            )

    # Load seed data
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        links = json.load(f)

    # Count existing before import
    before = await conn.fetchval("SELECT COUNT(*) FROM links")

    for link in links:
        # Support both "categories" (array) and legacy "category" (string)
        categories = link.get("categories")
        if categories is None:
            cat_val = link.get("category", "")
            categories = [cat_val] if cat_val else []

        if update_mode:
            await conn.execute(
                "INSERT INTO links (url, title, description, icon) "
                "VALUES ($1, $2, $3, $4) "
                "ON CONFLICT (url) DO UPDATE SET "
                "title = EXCLUDED.title, description = EXCLUDED.description, "
                "icon = EXCLUDED.icon",
                link["url"], link["title"], link["description"], link["icon"],
            )
        else:
            await conn.execute(
                "INSERT INTO links (url, title, description, icon) "
                "VALUES ($1, $2, $3, $4) "
                "ON CONFLICT (url) DO NOTHING",
                link["url"], link["title"], link["description"], link["icon"],
            )

        # Upsert categories
        link_id = await conn.fetchval("SELECT id FROM links WHERE url = $1", link["url"])
        if link_id and categories:
            if update_mode:
                await conn.execute("DELETE FROM link_categories WHERE link_id = $1", link_id)
            for cat in categories:
                await conn.execute(
                    "INSERT INTO link_categories (link_id, category) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    link_id, cat,
                )

    after = await conn.fetchval("SELECT COUNT(*) FROM links")
    inserted = after - before

    if inserted == 0 and not update_mode:
        print(f"All {len(links)} seed links already exist. Nothing to import.")
    elif inserted == 0 and update_mode:
        print(f"Updated metadata for {len(links)} existing links (0 new).")
    else:
        msg = f"Imported {inserted} new links"
        if update_mode:
            msg += ", updated metadata for existing ones"
        print(msg)

    print("Done.")
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
