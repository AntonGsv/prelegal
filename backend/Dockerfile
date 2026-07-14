FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONPATH=/app/src \
    PRELEGAL_DATABASE_URL=file:/app/data/prelegal.db \
    PRELEGAL_CORS_ORIGINS=http://localhost:3000

COPY pyproject.toml README.md ./
COPY src ./src

RUN uv sync --no-dev --no-install-project

RUN mkdir -p /app/data

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "prelegal_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
