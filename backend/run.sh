#!/bin/bash

# Auction Backend - Development Startup Script
# Starts all services: Web Server, RQ Worker (with scheduler)

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }
port_in_use()    { lsof -i :"$1" >/dev/null 2>&1; }

# Track PIDs for cleanup
PIDS=()

cleanup() {
    echo ""
    log_warning "Shutting down services..."
    for pid in "${PIDS[@]}"; do
        kill $pid 2>/dev/null || true
    done
    log_success "Cleanup complete"
    exit 0
}

trap cleanup EXIT INT TERM

# Change to script directory
cd "$(dirname "$0")"

# Create logs directory first
mkdir -p logs

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   Auction Backend - Development     ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# ============================================
# Prerequisites Check
# ============================================

log_info "Checking prerequisites..."

# Python
if ! command_exists python3; then
    log_error "Python 3 is not installed"
    exit 1
fi

# .env file
if [ ! -f .env ]; then
    log_error ".env file not found!"
    echo ""
    echo "  Create .env with:"
    echo "    DATABASE_URL=postgresql+asyncpg://user:pass@host/db"
    echo "    ADMIN_TOKEN=your-secret-token"
    echo "    REDIS_URL=redis://localhost:6379/0"
    exit 1
fi

log_success "Prerequisites OK"

# ============================================
# Virtual Environment
# ============================================

if [ ! -d ".venv" ]; then
    log_warning "Virtual environment not found. Creating..."
    python3 -m venv .venv
    log_success "Virtual environment created"
fi

log_info "Activating virtual environment..."
source .venv/bin/activate

log_info "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
log_success "Dependencies ready"

# ============================================
# Service Checks
# ============================================

echo ""
log_info "Checking services..."

# Redis (required for job scheduling)
log_info "Checking Redis connection..."

redis_running() {
    if command_exists redis-cli; then
        redis-cli ping >/dev/null 2>&1
    else
        python3 -c "
import redis
r = redis.from_url('redis://localhost:6379/0')
r.ping()
" >/dev/null 2>&1
    fi
}

if redis_running; then
    log_success "Redis is running"
else
    log_warning "Redis not running - starting via Docker..."

    if ! command_exists docker; then
        log_error "Docker is not installed. Please install Docker or start Redis manually."
        exit 1
    fi

    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    fi

    # Start Redis container (reuse existing or create new)
    if docker ps -a --format '{{.Names}}' | grep -q '^redis$'; then
        docker start redis >/dev/null 2>&1
    else
        docker run -d --name redis -p 6379:6379 redis:alpine >/dev/null 2>&1
    fi

    # Wait for Redis to be ready
    sleep 2

    if redis_running; then
        log_success "Redis started via Docker"
    else
        log_error "Failed to start Redis"
        exit 1
    fi
fi

# Database
log_info "Checking database connection..."
python3 -c "
import asyncio
from app.db import engine
from sqlalchemy import text

async def check_db():
    try:
        async with engine.connect() as conn:
            await conn.execute(text('SELECT 1'))
        print('  Database connection OK')
    except Exception as e:
        print(f'  Database connection FAILED: {e}')
        exit(1)

asyncio.run(check_db())
" || exit 1

# Port
WEB_PORT=${PORT:-8000}
if port_in_use $WEB_PORT; then
    log_error "Port $WEB_PORT already in use!"
    echo "  Free it: lsof -ti:$WEB_PORT | xargs kill -9"
    exit 1
fi

log_success "All checks passed"

# ============================================
# Start Services
# ============================================

echo ""
echo -e "${BLUE}Starting services...${NC}"
echo ""

# 1. RQ Worker (includes scheduler via with_scheduler=True)
log_info "Starting RQ Worker (with scheduler)..."
python3 app/worker.py > logs/rq-worker.log 2>&1 &
RQ_PID=$!
PIDS+=($RQ_PID)
sleep 2

if ps -p $RQ_PID > /dev/null 2>&1; then
    log_success "RQ Worker started (PID: $RQ_PID)"
else
    log_error "Failed to start RQ Worker - check logs/rq-worker.log"
    exit 1
fi

# 2. FastAPI + Socket.IO Server
log_info "Starting FastAPI server..."
uvicorn app.main:sio_app \
    --host 0.0.0.0 \
    --port $WEB_PORT \
    --reload \
    --log-level info \
    2>&1 | tee logs/uvicorn.log &

UVICORN_PID=$!
PIDS+=($UVICORN_PID)
sleep 3

if ps -p $UVICORN_PID > /dev/null 2>&1; then
    log_success "FastAPI server started (PID: $UVICORN_PID)"
else
    log_error "Failed to start FastAPI server"
    exit 1
fi

# ============================================
# Running Summary
# ============================================

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   Auction Backend is Running!       ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "  Services:"
echo "    - FastAPI + Socket.IO  (PID: $UVICORN_PID)"
echo "    - RQ Worker + Scheduler (PID: $RQ_PID)"
echo ""
echo "  Endpoints:"
echo "    API:    http://localhost:$WEB_PORT"
echo "    Docs:   http://localhost:$WEB_PORT/docs"
echo "    Health: http://localhost:$WEB_PORT/health"
echo ""
echo "  Logs:"
echo "    logs/uvicorn.log"
echo "    logs/rq-worker.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for main process
wait $UVICORN_PID
