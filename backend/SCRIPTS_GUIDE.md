# Scripts and Commands Guide

This guide explains all available scripts and commands for running the auction backend.

## Quick Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `make dev` | Start development server | Daily development |
| `make prod` | Start production server | Production deployment |
| `./run.sh` | Comprehensive startup with checks | First-time setup, troubleshooting |
| `docker-compose up` | Start entire stack in Docker | Quick testing, demos |
| `make test` | Run test suite | Before committing code |
| `make help` | Show all commands | When you forget a command |

---

## Shell Scripts

### 1. `run.sh` - Comprehensive Startup Script

**What it does:**
- ✅ Checks all prerequisites (Python, Redis, PostgreSQL)
- ✅ Creates/activates virtual environment
- ✅ Installs dependencies
- ✅ Verifies database connection
- ✅ Checks port availability
- ✅ Starts RQ worker and web server
- ✅ Creates logs directory
- ✅ Provides colored status output

**Usage:**
```bash
./run.sh
```

**When to use:**
- First time setup
- After pulling major changes
- When troubleshooting issues
- When you want full verification

**Output includes:**
- All service PIDs
- Log file locations
- Access URLs
- Startup status

---

### 2. `dev.sh` - Quick Development Mode

**What it does:**
- ⚡ Fast startup (minimal checks)
- ⚡ Auto-reload on code changes
- ⚡ Starts RQ worker in background
- ⚡ Assumes prerequisites are met

**Usage:**
```bash
./dev.sh
```

**When to use:**
- Daily development work
- After initial setup is complete
- When you need quick restarts
- Testing code changes

**Features:**
- Hot reload enabled
- Single terminal window
- Quick startup
- Ctrl+C stops everything

---

### 3. `prod.sh` - Production Mode

**What it does:**
- 🚀 Production-ready configuration
- 🚀 Multiple workers (4 by default)
- 🚀 Proper logging setup
- 🚀 Uses Gunicorn if available
- 🚀 Multiple RQ workers
- 🚀 Validates production settings

**Usage:**
```bash
./prod.sh

# Or with custom settings
WORKERS=8 PORT=8080 ./prod.sh
```

**When to use:**
- Production deployment
- Staging environment
- Performance testing
- Load testing

**Environment variables:**
- `WORKERS` - Number of worker processes (default: 4)
- `PORT` - Port to listen on (default: 8000)

---

## Makefile Commands

### Setup & Installation

```bash
make setup          # Initial setup - creates venv, installs deps, creates .env
make install        # Install/update dependencies only
```

### Running Services

```bash
make dev            # Development mode (hot reload)
make prod           # Production mode (multiple workers)
make run            # Comprehensive startup (run.sh)
make worker         # Run RQ worker only
```

### Testing & Quality

```bash
make test           # Run pytest
make test-coverage  # Run tests with coverage report
make lint           # Check code style with ruff
make format         # Format code with black and isort
make typecheck      # Type checking with mypy
```

### Database Operations

```bash
make db-migrate msg="description"  # Create new migration
make db-upgrade                     # Apply all migrations
make db-downgrade                   # Revert last migration
make db-reset                       # Reset database (destroys data!)
```

### Maintenance

```bash
make clean          # Remove cache files, __pycache__, etc.
make logs           # Tail all logs
make logs-web       # Tail web server logs only
make logs-worker    # Tail worker logs only
make status         # Check status of all services
make kill           # Stop all running services
```

### Docker Operations

```bash
make docker-build           # Build Docker image
make docker-run            # Run Docker container
make docker-compose-up     # Start with docker-compose
make docker-compose-down   # Stop docker-compose stack
```

### Development Tools

```bash
make shell          # Open Python shell with app context
make check-env      # Validate .env configuration
make requirements   # Update requirements.txt from venv
```

---

## Docker Commands

### Using Docker Compose (Recommended)

**Start everything:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f
docker-compose logs -f web      # Web server only
docker-compose logs -f worker   # Worker only
```

**Stop everything:**
```bash
docker-compose down
```

**Rebuild and restart:**
```bash
docker-compose up -d --build
```

**Check status:**
```bash
docker-compose ps
```

### Manual Docker Commands

**Build image:**
```bash
docker build -t auction-backend .
```

**Run container:**
```bash
docker run -p 8000:8000 --env-file .env auction-backend
```

---

## Command Combinations

### Fresh Start (Development)
```bash
make clean          # Clean cache
make setup          # Setup environment
make db-upgrade     # Apply migrations
make dev            # Start development server
```

### Fresh Start (Docker)
```bash
docker-compose down -v          # Stop and remove volumes
docker-compose up -d --build    # Rebuild and start
docker-compose logs -f          # Watch logs
```

### Deploy to Production
```bash
git pull                        # Get latest code
source .venv/bin/activate       # Activate venv
pip install -r requirements.txt # Update dependencies
make db-upgrade                 # Apply migrations
make prod                       # Start production server
```

### Running Tests
```bash
make test                       # Quick test
make test-coverage              # Detailed coverage
make lint                       # Check style
make typecheck                  # Check types
```

### Troubleshooting
```bash
make status         # Check what's running
make kill           # Stop everything
make clean          # Clean cache
make logs           # View logs
./run.sh            # Comprehensive restart with checks
```

---

## Environment Variables

Control behavior with environment variables:

```bash
# Production script
WORKERS=8 PORT=8080 ./prod.sh

# Development
DEBUG=true make dev

# Docker
ADMIN_TOKEN=my-secret docker-compose up
```

---

## Log Files

All logs are stored in `logs/` directory:

- `logs/uvicorn.log` - Web server logs
- `logs/rq-worker.log` - Background worker logs (dev)
- `logs/rq-worker-1.log` through `rq-worker-4.log` - Worker logs (prod)
- `logs/access.log` - HTTP access logs (prod only)
- `logs/error.log` - Error logs (prod only)

View logs:
```bash
tail -f logs/uvicorn.log        # Web server
tail -f logs/rq-worker.log      # Worker
tail -f logs/*.log              # All logs
make logs                        # Using make
```

---

## Port Reference

Default ports used:

| Service | Port | URL |
|---------|------|-----|
| Web API | 8000 | http://localhost:8000 |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |
| RQ Dashboard | 9181 | http://localhost:9181 |

Change ports:
```bash
# In .env file
PORT=8080

# Or via environment
PORT=8080 ./prod.sh
```

---

## Systemd Service (Production)

For production, use systemd for automatic restarts:

1. Create service file:
```bash
sudo nano /etc/systemd/system/auction-backend.service
```

2. Add configuration (see QUICK_START.md for example)

3. Enable and start:
```bash
sudo systemctl enable auction-backend
sudo systemctl start auction-backend
sudo systemctl status auction-backend
```

4. View logs:
```bash
sudo journalctl -u auction-backend -f
```

---

## Tips & Best Practices

### Development
- Use `make dev` for daily work
- Run `make test` before committing
- Use `make clean` if things get weird
- Check logs with `make logs`

### Production
- Always set `DEBUG=false` in .env
- Use strong `ADMIN_TOKEN`
- Configure proper CORS origins
- Use `./prod.sh` or systemd
- Monitor logs regularly

### Docker
- Use docker-compose for easy setup
- Mount volumes for development
- Use named volumes for data persistence
- Check container logs regularly

### Troubleshooting
- Start with `make status`
- Check logs with `make logs`
- Use `./run.sh` for full diagnostics
- Try `make clean` for cache issues
- Use `make kill` to stop everything

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Port in use | `make kill` or `lsof -ti :8000 \| xargs kill -9` |
| Import errors | `make install` or `pip install -r requirements.txt` |
| Database errors | Check connection string, run `make db-upgrade` |
| Redis errors | Start Redis: `brew services start redis` (macOS) |
| Stale cache | `make clean` |
| Config invalid | `make check-env` |

---

## Next Steps

1. Start with `./run.sh` for first-time setup
2. Use `make dev` for daily development
3. Read QUICK_START.md for detailed instructions
4. Check REFACTORING_SUMMARY.md for architecture

**Questions?** Run `make help` or check the documentation!
