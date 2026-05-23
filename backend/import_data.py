"""Import database data from a SQL dump file.

Usage:
    python import_data.py backup.sql              # import from file
    python import_data.py - < backup.sql          # import from stdin
    python import_data.py --dry-run backup.sql    # validate without executing
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
    "password": os.getenv("PG_PASSWORD", "canterlot"),
}


def parse_sql_content(content):
    """Split SQL content into individual statements, skipping comments and blanks."""
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
        print("Usage: python import_data.py [--dry-run] (<sql_file> | -)")
        sys.exit(1)

    dry_run = "--dry-run" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--dry-run"]

    if not args:
        print("Error: no SQL file specified")
        sys.exit(1)

    source = args[0]
    if source == "-":
        content = sys.stdin.read()
        source_label = "stdin"
    else:
        if not os.path.exists(source):
            print(f"Error: file not found: {source}")
            sys.exit(1)
        with open(source, "r", encoding="utf-8") as f:
            content = f.read()
        source_label = source

    statements = parse_sql_content(content)
    print(f"Parsed {len(statements)} SQL statements from {source_label}")

    if dry_run:
        print("[DRY RUN] Statements to execute:")
        for i, stmt in enumerate(statements, 1):
            preview = stmt[:120] + ("..." if len(stmt) > 120 else "")
            print(f"  {i}: {preview}")
        print("Dry run complete. No changes made.")
        return

    conn = await asyncpg.connect(**DB_CONFIG)

    try:
        async with conn.transaction():
            for i, stmt in enumerate(statements, 1):
                try:
                    await conn.execute(stmt)
                except Exception as e:
                    print(f"Error at statement {i}: {e}")
                    print(f"  SQL: {stmt[:200]}")
                    raise
        print(f"Successfully executed {len(statements)} statements.")
    except Exception:
        print("Import failed. All changes have been rolled back.")
        await conn.close()
        sys.exit(1)

    await conn.close()
    print("Import complete.")


if __name__ == "__main__":
    asyncio.run(main())
