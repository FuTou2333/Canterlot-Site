FROM python:3.12-slim

WORKDIR /app/backend

# 使用中科大镜像源 + 安装系统依赖
RUN sed -i 's|http://deb.debian.org/debian|http://mirrors.ustc.edu.cn/debian|g' /etc/apt/sources.list.d/debian.sources \
    && sed -i 's|http://security.debian.org/debian-security|http://mirrors.ustc.edu.cn/debian-security|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖（中科大镜像源）
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    -i https://mirrors.ustc.edu.cn/pypi/web/simple \
    --trusted-host mirrors.ustc.edu.cn

# 创建非 root 用户和基础目录
RUN mkdir -p /app/assets /app/font \
    && useradd -m -s /bin/bash appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
