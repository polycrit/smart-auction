#!/bin/bash

# Quick development startup script
# This is a simplified version for rapid development

set -e

cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Auction Backend (Development Mode)${NC}"
echo ""

# Activate venv if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Create logs directory
mkdir -p logs

# Start RQ worker in background
echo "Starting RQ worker..."
python app/worker.py > logs/rq-worker.log 2>&1 &
RQ_PID=$!

# Give worker time to start
sleep 1

# Start uvicorn with reload
echo ""
echo -e "${GREEN}✓ Server starting at http://localhost:8000${NC}"
echo -e "${GREEN}✓ API Docs at http://localhost:8000/docs${NC}"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $RQ_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

uvicorn app.main:sio_app --reload --host 0.0.0.0 --port 8000
