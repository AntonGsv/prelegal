#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose up --build -d

# Wait for backend health check to pass before declaring services ready
max_wait=60
elapsed=0
while [ "$elapsed" -lt "$max_wait" ]; do
    status=$(docker compose exec -T backend python -c \
        "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health').read()" \
        2>/dev/null && echo "up" || echo "down")
    if [ "$status" = "up" ]; then
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
done

if [ "$status" != "up" ]; then
    echo "Warning: Backend did not become healthy within $max_wait seconds." >&2
fi

echo "Prelegal is starting:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
