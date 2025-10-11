#!/bin/bash

# Production startup script
# Runs with multiple workers and production settings

set -e

cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Auction Backend (Production Mode)${NC}"
echo ""

# Check for production .env
if [ ! -f .env ]; then
    echo -e "${RED}ERROR: .env file not found${NC}"
    exit 1
fi

# Check DEBUG is not set to true
if grep -q "DEBUG=true" .env 2>/dev/null; then
    echo -e "${RED}WARNING: DEBUG=true detected in .env file${NC}"
    echo "Set DEBUG=false for production"
    exit 1
fi

# Activate venv
if [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo -e "${RED}ERROR: Virtual environment not found${NC}"
    echo "Run: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Number of workers (default to CPU count)
WORKERS=${WORKERS:-4}
PORT=${PORT:-8000}

# Start RQ worker in background (production uses multiple workers)
echo "Starting RQ workers (4 workers)..."
for i in {1..4}; do
    python app/worker.py > logs/rq-worker-$i.log 2>&1 &
    echo "  Worker $i started (PID: $!)"
done

sleep 2

echo ""
echo -e "${GREEN}✓ Starting production server with $WORKERS workers${NC}"
echo -e "${GREEN}✓ Listening on 0.0.0.0:$PORT${NC}"
echo ""

# Start with gunicorn for production
if command -v gunicorn >/dev/null 2>&1; then
    gunicorn app.main:sio_app \
        --worker-class uvicorn.workers.UvicornWorker \
        --workers $WORKERS \
        --bind 0.0.0.0:$PORT \
        --access-logfile logs/access.log \
        --error-logfile logs/error.log \
        --log-level info \
        --timeout 120 \
        --graceful-timeout 30 \
        --keep-alive 5
else
    echo "Gunicorn not found, using uvicorn..."
    uvicorn app.main:sio_app \
        --host 0.0.0.0 \
        --port $PORT \
        --workers $WORKERS \
        --log-level info \
        --no-access-log
fi
