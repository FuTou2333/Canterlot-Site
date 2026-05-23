"""Export database data as SQL dump.

Usage:
    python export_data.py > backup.sql        # export to file
    python export_data.py --no-click-count    # exclude click_count data
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime


DB_CONFIG = {
    "host": os.getenv("PG_HOST", "127.0.0.1"),
    "port": int(os.getenv("PG_PORT", "5432")),
    "database": os.getenv("PG_DATABASE", "canterlot"),
    "user": os.getenv("PG_USER", "canterlot"),
    "password": os.getenv("PG_PASSWORD", "canterlot"),
}


def escape_sql(value):
    """Escape a value for SQL string literal."""
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def format_timestamptz(val):
    """Format a datetime for SQL insertion."""
    if val is None:
        return "NULL"
    return escape_sql(val.isoformat())


async def main():
    no_clicks = "--no-click-count" in sys.argv

    conn = await asyncpg.connect(**DB_CONFIG)

    sql_lines = []
    sql_lines.append(f"-- Canterlot Site data export")
    sql_lines.append(f"-- Generated: {datetime.now().isoformat()}")
    sql_lines.append("")

    # --- Categories ---
    categories = await conn.fetch("SELECT key, label, sort_order FROM categories ORDER BY sort_order")
    sql_lines.append("-- ====== Categories ======")
    for row in categories:
        sql_lines.append(
            f"INSERT INTO categories (key, label, sort_order) VALUES "
            f"({escape_sql(row['key'])}, {escape_sql(row['label'])}, {row['sort_order']}) "
            f"ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;"
        )
    sql_lines.append("")

    # --- Links ---
    links = await conn.fetch(
        "SELECT id, url, title, description, icon, click_count, last_clicked_at, created_at "
        "FROM links ORDER BY id"
    )
    sql_lines.append("-- ====== Links ======")
    for row in links:
        click_val = "0" if no_clicks else str(row["click_count"])
        last_clicked_val = "NULL" if no_clicks else format_timestamptz(row["last_clicked_at"])

        sql_lines.append(
            f"INSERT INTO links (id, url, title, description, icon, click_count, last_clicked_at, created_at) VALUES ("
            f"{row['id']}, {escape_sql(row['url'])}, {escape_sql(row['title'])}, "
            f"{escape_sql(row['description'])}, {escape_sql(row['icon'])}, "
            f"{click_val}, {last_clicked_val}, {format_timestamptz(row['created_at'])}"
            f") ON CONFLICT (id) DO UPDATE SET "
            f"url = EXCLUDED.url, title = EXCLUDED.title, description = EXCLUDED.description, "
            f"icon = EXCLUDED.icon, click_count = EXCLUDED.click_count, "
            f"last_clicked_at = EXCLUDED.last_clicked_at;"
        )
    sql_lines.append("")

    # --- Link Categories ---
    link_cats = await conn.fetch(
        "SELECT link_id, category FROM link_categories ORDER BY link_id, category"
    )
    sql_lines.append("-- ====== Link Categories ======")
    for row in link_cats:
        sql_lines.append(
            f"INSERT INTO link_categories (link_id, category) VALUES "
            f"({row['link_id']}, {escape_sql(row['category'])}) "
            f"ON CONFLICT DO NOTHING;"
        )
    sql_lines.append("")

    # --- Reset sequence ---
    sql_lines.append("-- Reset link ID sequence")
    sql_lines.append(
        "SELECT setval('links_id_seq', COALESCE((SELECT MAX(id) FROM links), 1));"
    )

    await conn.close()

    print("\n".join(sql_lines))


if __name__ == "__main__":
    asyncio.run(main())
