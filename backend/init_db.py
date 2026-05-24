"""初始化数据库并导入种子数据。

用法：
    python init_db.py              # 创建数据表 + 导入种子数据
    python init_db.py --drop       # 先删除数据表，再创建 + 导入
    python init_db.py --update     # 更新已有链接和分类
"""

import asyncio
import json
import os
import sys

import database

SEED_FILE = os.path.join(os.path.dirname(__file__), "seed_data.json")
CATEGORIES_FILE = os.path.join(os.path.dirname(__file__), "categories.json")

DROP_TABLE_SQL = """
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS link_categories CASCADE;
DROP TABLE IF EXISTS links CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
"""


async def main():
    drop_first = "--drop" in sys.argv
    update_mode = "--update" in sys.argv

    await database.init_pg()

    if drop_first:
        async with database.pg_pool.acquire() as conn:
            print("正在删除现有数据表...")
            await conn.execute(DROP_TABLE_SQL)
        await database.close_pg()
        await database.init_pg()

    await database.run_migrations()

    # 导入分类数据
    with open(CATEGORIES_FILE, "r", encoding="utf-8") as f:
        categories = json.load(f)

    async with database.pg_pool.acquire() as conn:
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

        # 导入链接数据
        with open(SEED_FILE, "r", encoding="utf-8") as f:
            links = json.load(f)

        before = await conn.fetchval("SELECT COUNT(*) FROM links")

        for link in links:
            categories_list = link.get("categories")
            if categories_list is None:
                cat_val = link.get("category", "")
                categories_list = [cat_val] if cat_val else []

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

            link_id = await conn.fetchval("SELECT id FROM links WHERE url = $1", link["url"])
            if link_id and categories_list:
                if update_mode:
                    await conn.execute("DELETE FROM link_categories WHERE link_id = $1", link_id)
                for cat in categories_list:
                    await conn.execute(
                        "INSERT INTO link_categories (link_id, category) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                        link_id, cat,
                    )

        after = await conn.fetchval("SELECT COUNT(*) FROM links")
        inserted = after - before

        if inserted == 0 and not update_mode:
            print(f"所有 {len(links)} 条种子链接已存在，无需导入。")
        elif inserted == 0 and update_mode:
            print(f"已更新 {len(links)} 条已有链接的元数据（0 条新增）。")
        else:
            msg = f"导入了 {inserted} 条新链接"
            if update_mode:
                msg += "，已更新已有链接的元数据"
            print(msg)

    print("完成。")
    await database.close_pg()


if __name__ == "__main__":
    asyncio.run(main())
