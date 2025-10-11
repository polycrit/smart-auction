.PHONY: help install dev prod test clean logs setup db-migrate db-upgrade worker

# Default target
help:
	@echo "Auction Backend - Available Commands"
	@echo ""
	@echo "  make setup       - Initial setup (venv, dependencies, .env)"
	@echo "  make install     - Install dependencies"
	@echo "  make dev         - Run development server"
	@echo "  make prod        - Run production server"
	@echo "  make worker      - Run RQ worker only"
	@echo "  make test        - Run tests"
	@echo "  make lint        - Run linting"
	@echo "  make format      - Format code with black"
	@echo "  make clean       - Clean up cache files"
	@echo "  make logs        - Tail all logs"
	@echo "  make db-migrate  - Create new migration"
	@echo "  make db-upgrade  - Apply migrations"
	@echo "  make shell       - Open Python shell with app context"
	@echo ""

# Initial setup
setup:
	@echo "Setting up development environment..."
	@python3 -m venv .venv
	@.venv/bin/pip install --upgrade pip
	@.venv/bin/pip install -r requirements.txt
	@if [ ! -f .env ]; then \
		echo "Creating .env file from example..."; \
		cp .env.example .env 2>/dev/null || echo "Please create .env file manually"; \
	fi
	@mkdir -p logs
	@echo "✓ Setup complete! Run 'make dev' to start"

# Install/update dependencies
install:
	@echo "Installing dependencies..."
	@.venv/bin/pip install --upgrade pip
	@.venv/bin/pip install -r requirements.txt
	@echo "✓ Dependencies installed"

# Development mode
dev:
	@./dev.sh

# Production mode
prod:
	@./prod.sh

# Run comprehensive startup script
run:
	@./run.sh

# Run RQ worker only
worker:
	@source .venv/bin/activate && python app/worker.py

# Run tests
test:
	@echo "Running tests..."
	@source .venv/bin/activate && pytest -v

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	@source .venv/bin/activate && pytest --cov=app --cov-report=html --cov-report=term

# Lint code
lint:
	@echo "Linting code..."
	@source .venv/bin/activate && \
		ruff check app/ || echo "Install ruff: pip install ruff"

# Format code
format:
	@echo "Formatting code..."
	@source .venv/bin/activate && \
		black app/ || echo "Install black: pip install black"
	@source .venv/bin/activate && \
		isort app/ || echo "Install isort: pip install isort"

# Type checking
typecheck:
	@echo "Type checking..."
	@source .venv/bin/activate && \
		mypy app/ || echo "Install mypy: pip install mypy"

# Clean up cache files
clean:
	@echo "Cleaning up..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type f -name "*.pyo" -delete 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@rm -rf .pytest_cache .coverage htmlcov/ .mypy_cache/
	@echo "✓ Cleaned"

# View logs
logs:
	@echo "Tailing logs (Ctrl+C to stop)..."
	@tail -f logs/*.log 2>/dev/null || echo "No logs found"

# View web server logs only
logs-web:
	@tail -f logs/uvicorn.log 2>/dev/null || echo "No web logs found"

# View worker logs only
logs-worker:
	@tail -f logs/rq-worker*.log 2>/dev/null || echo "No worker logs found"

# Database migrations
db-migrate:
	@echo "Creating new migration..."
	@source .venv/bin/activate && \
		alembic revision --autogenerate -m "$(msg)" || \
		echo "Usage: make db-migrate msg='description'"

db-upgrade:
	@echo "Applying migrations..."
	@source .venv/bin/activate && alembic upgrade head

db-downgrade:
	@echo "Reverting last migration..."
	@source .venv/bin/activate && alembic downgrade -1

db-reset:
	@echo "Resetting database (WARNING: destroys all data)..."
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		source .venv/bin/activate && alembic downgrade base && alembic upgrade head; \
	fi

# Python shell with app context
shell:
	@source .venv/bin/activate && python -i -c "from app import *; from app.db import *; from app.models import *"

# Check service status
status:
	@echo "=== Service Status ==="
	@echo ""
	@echo "Web Server:"
	@lsof -i :8000 || echo "  Not running"
	@echo ""
	@echo "Redis:"
	@redis-cli ping 2>/dev/null && echo "  Running" || echo "  Not running"
	@echo ""
	@echo "PostgreSQL:"
	@python -c "import asyncio; from app.db import engine; from sqlalchemy import text; asyncio.run((lambda: engine.connect().__aenter__())()).execute(text('SELECT 1'))" 2>/dev/null && echo "  Connected" || echo "  Not connected"

# Kill all processes
kill:
	@echo "Stopping all services..."
	@lsof -ti :8000 | xargs kill -9 2>/dev/null || true
	@pkill -f "python app/worker.py" 2>/dev/null || true
	@echo "✓ All services stopped"

# Docker commands
docker-build:
	@docker build -t auction-backend .

docker-run:
	@docker run -p 8000:8000 --env-file .env auction-backend

docker-compose-up:
	@docker-compose up -d

docker-compose-down:
	@docker-compose down

# Development tools
requirements:
	@echo "Updating requirements.txt..."
	@source .venv/bin/activate && pip freeze > requirements.txt
	@echo "✓ Requirements updated"

check-env:
	@echo "Checking .env file..."
	@python -c "from app.config import settings; print('✓ Configuration valid')" || echo "✗ Configuration invalid"
