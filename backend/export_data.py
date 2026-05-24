"""导出数据库数据为 SQL 转储（使用 pg_dump 确保安全）。

用法：
    python export_data.py > backup.sql        # 导出到文件
    python export_data.py --no-click-count    # 导出时清零点击计数
    python export_data.py --no-visits         # 排除访问记录
"""

import os
import re
import subprocess
import sys

DB_HOST = os.getenv("PG_HOST", "127.0.0.1")
DB_PORT = os.getenv("PG_PORT", "5432")
DB_NAME = os.getenv("PG_DATABASE", "canterlot")
DB_USER = os.getenv("PG_USER", "canterlot")
DB_PASSWORD = os.environ.get("PG_PASSWORD")
if not DB_PASSWORD:
    print("错误：缺少 PG_PASSWORD 环境变量", file=sys.stderr)
    sys.exit(1)


def zero_click_count(sql_output):
    """将 links 表 INSERT 语句中的 click_count 列置零。"""
    lines = sql_output.split("\n")
    result = []
    for line in lines:
        if "INSERT INTO" in line and "links" in line and "VALUES" in line:
            line = re.sub(
                r", (\d+), (NULL|'[^']*'), ('[^']*'\);)$",
                r", 0, \2, \3",
                line,
            )
        result.append(line)
    return "\n".join(result)


def main():
    no_clicks = "--no-click-count" in sys.argv
    no_visits = "--no-visits" in sys.argv

    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD

    base_cmd = [
        "pg_dump",
        "-h", DB_HOST,
        "-p", DB_PORT,
        "-U", DB_USER,
        "-d", DB_NAME,
        "--no-owner",
        "--no-acl",
        "--inserts",
        "--on-conflict-do-nothing",
    ]

    if no_visits:
        base_cmd.extend(["--exclude-table-data", "visits"])

    result = subprocess.run(base_cmd, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"pg_dump 错误：{result.stderr}", file=sys.stderr)
        sys.exit(1)

    output = result.stdout

    if no_clicks:
        output = zero_click_count(output)
        print("-- 已将 click_count 列重置为 0", file=sys.stderr)

    print(output)


if __name__ == "__main__":
    main()
