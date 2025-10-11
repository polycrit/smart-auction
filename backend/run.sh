#!/bin/bash

# Auction Backend - Main Startup Script
# This script starts all necessary services for the auction backend

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :"$1" >/dev/null 2>&1
}

# Trap to cleanup on exit
cleanup() {
    log_warning "Shutting down services..."
    if [ ! -z "$UVICORN_PID" ]; then
        kill $UVICORN_PID 2>/dev/null || true
    fi
    if [ ! -z "$RQ_PID" ]; then
        kill $RQ_PID 2>/dev/null || true
    fi
    log_success "Cleanup complete"
}

trap cleanup EXIT INT TERM

# Change to script directory
cd "$(dirname "$0")"

log_info "Starting Auction Backend..."
echo ""

# Check prerequisites
log_info "Checking prerequisites..."

if ! command_exists python3; then
    log_error "Python 3 is not installed"
    exit 1
fi

if ! command_exists redis-cli; then
    log_warning "Redis CLI not found. Make sure Redis server is running separately."
fi

# Check if .env file exists
if [ ! -f .env ]; then
    log_error ".env file not found!"
    log_info "Please create a .env file with the following variables:"
    echo "  DATABASE_URL=postgresql+asyncpg://user:pass@localhost/dbname"
    echo "  ADMIN_TOKEN=your-secret-token"
    echo "  REDIS_URL=redis://localhost:6379/0"
    exit 1
fi

log_success "Prerequisites checked"
echo ""

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    log_warning "Virtual environment not found. Creating one..."
    python3 -m venv .venv
    log_success "Virtual environment created"
fi

# Activate virtual environment
log_info "Activating virtual environment..."
source .venv/bin/activate

# Install/update dependencies
log_info "Installing/updating dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt
log_success "Dependencies ready"
echo ""

# Check Redis connection
log_info "Checking Redis connection..."
if command_exists redis-cli; then
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Redis is running"
    else
        log_error "Cannot connect to Redis. Please start Redis server:"
        echo "  brew services start redis  (macOS)"
        echo "  sudo systemctl start redis  (Linux)"
        exit 1
    fi
else
    log_warning "Cannot verify Redis status"
fi

# Check if PostgreSQL is accessible
log_info "Checking database connection..."
python3 -c "
import asyncio
from app.db import engine
from sqlalchemy import text

async def check_db():
    try:
        async with engine.connect() as conn:
            await conn.execute(text('SELECT 1'))
        print('✓ Database connection successful')
    except Exception as e:
        print(f'✗ Database connection failed: {e}')
        exit(1)

asyncio.run(check_db())
" || exit 1

echo ""

# Check if ports are available
WEB_PORT=8000
if port_in_use $WEB_PORT; then
    log_error "Port $WEB_PORT is already in use!"
    log_info "To free the port, run: lsof -ti:$WEB_PORT | xargs kill -9"
    exit 1
fi

log_success "All checks passed"
echo ""

# Start RQ worker in background
log_info "Starting RQ worker for background jobs..."
python3 app/worker.py > logs/rq-worker.log 2>&1 &
RQ_PID=$!
sleep 2

if ps -p $RQ_PID > /dev/null; then
    log_success "RQ worker started (PID: $RQ_PID)"
else
    log_error "Failed to start RQ worker"
    exit 1
fi

echo ""

# Start the FastAPI application
log_info "Starting FastAPI server on http://localhost:$WEB_PORT"
log_info "API Documentation: http://localhost:$WEB_PORT/docs"
log_info "Health Check: http://localhost:$WEB_PORT/health"
echo ""
log_warning "Press Ctrl+C to stop all services"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Start uvicorn
uvicorn app.main:sio_app \
    --host 0.0.0.0 \
    --port $WEB_PORT \
    --reload \
    --log-level info \
    2>&1 | tee logs/uvicorn.log &

UVICORN_PID=$!

# Wait for uvicorn to start
sleep 3

if ps -p $UVICORN_PID > /dev/null; then
    log_success "FastAPI server started (PID: $UVICORN_PID)"
    echo ""
    log_success "=== Auction Backend is Running ==="
    echo ""
    echo "  🌐 API:    http://localhost:$WEB_PORT"
    echo "  📚 Docs:   http://localhost:$WEB_PORT/docs"
    echo "  ❤️  Health: http://localhost:$WEB_PORT/health"
    echo ""
    echo "  📋 Logs:"
    echo "    - Web:    logs/uvicorn.log"
    echo "    - Worker: logs/rq-worker.log"
    echo ""
else
    log_error "Failed to start FastAPI server"
    exit 1
fi

# Wait for processes
wait $UVICORN_PID
