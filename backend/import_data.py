"""从 SQL 转储文件导入数据库数据。

用法：
    python import_data.py backup.sql              # 从文件导入
    python import_data.py - < backup.sql          # 从标准输入导入
    python import_data.py --dry-run backup.sql    # 仅验证，不实际执行
"""

import asyncio
import asyncpg
import os
import sys


DB_CONFIG = {
    "host": os.getenv("PG_HOST", "127.0.0.1"),
    "port": int(os.getenv("PG_PORT", "5432")),
    "database": os.getenv("PG_DATABASE", "canterlot"),
    "user": os.getenv("PG_USER", "canterlot"),
    "password": os.environ.get("PG_PASSWORD"),
}
if not DB_CONFIG["password"]:
    print("错误：缺少 PG_PASSWORD 环境变量", file=sys.stderr)
    sys.exit(1)


def parse_sql_content(content):
    """将 SQL 内容拆分为独立语句，跳过注释和空行。"""
    statements = []
    current = []
    for line in content.split("\n"):
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            continue
        current.append(line)
        if stripped.endswith(";"):
            stmt = "\n".join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []

    if current:
        stmt = "\n".join(current).strip()
        if stmt:
            statements.append(stmt)

    return statements


async def main():
    if len(sys.argv) < 2:
        print("用法：python import_data.py [--dry-run] (<sql文件> | -)")
        sys.exit(1)

    dry_run = "--dry-run" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--dry-run"]

    if not args:
        print("错误：未指定 SQL 文件")
        sys.exit(1)

    source = args[0]
    if source == "-":
        content = sys.stdin.read()
        source_label = "stdin"
    else:
        if not os.path.exists(source):
            print(f"错误：文件未找到：{source}")
            sys.exit(1)
        with open(source, "r", encoding="utf-8") as f:
            content = f.read()
        source_label = source

    statements = parse_sql_content(content)
    print(f"从 {source_label} 解析出 {len(statements)} 条 SQL 语句")

    if dry_run:
        print("[演练模式] 将要执行的语句：")
        for i, stmt in enumerate(statements, 1):
            preview = stmt[:120] + ("..." if len(stmt) > 120 else "")
            print(f"  {i}: {preview}")
        print("演练完成。未做任何更改。")
        return

    conn = await asyncpg.connect(**DB_CONFIG)

    try:
        async with conn.transaction():
            for i, stmt in enumerate(statements, 1):
                try:
                    await conn.execute(stmt)
                except Exception as e:
                    print(f"第 {i} 条语句出错：{e}")
                    print(f"  SQL：{stmt[:200]}")
                    raise
        print(f"成功执行 {len(statements)} 条语句。")
    except Exception:
        print("导入失败。所有更改已回滚。")
        await conn.close()
        sys.exit(1)

    await conn.close()
    print("导入完成。")


if __name__ == "__main__":
    asyncio.run(main())
