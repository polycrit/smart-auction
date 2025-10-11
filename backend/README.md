# Auction Backend - Refactored Architecture

A modern, production-ready auction system built with FastAPI, Socket.IO, and PostgreSQL.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env  # Edit with your settings

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:sio_app --reload

# Start RQ worker (separate terminal)
python app/worker.py
```

## 📁 Project Structure

```
app/
├── config.py              # Centralized configuration
├── db.py                  # Database connection & session
├── deps.py                # FastAPI dependencies
├── enums.py               # Type-safe enums for statuses
├── exceptions.py          # Custom exception hierarchy
├── jobs.py                # Background job definitions
├── logging_config.py      # Logging setup
├── main.py                # FastAPI app entry point
├── models.py              # SQLAlchemy ORM models
├── repositories.py        # Data access layer
├── schemas.py             # Pydantic request/response schemas
├── utils.py               # Shared utility functions
├── websocket.py           # Socket.IO event handlers
├── routes/
│   ├── admin.py          # Admin API endpoints
│   └── public.py         # Public API endpoints
└── services/
    ├── auctions.py       # Auction business logic
    └── bids.py           # Bid processing logic
```

## 🔑 Key Features

### 1. **Configuration Management**
- Centralized settings via `pydantic-settings`
- Type-safe environment variable validation
- Easy configuration overrides for testing

```python
from app.config import settings
print(settings.database_url)
```

### 2. **Type Safety**
- Enums for auction/lot statuses and currencies
- Comprehensive type hints throughout
- Pydantic validation on all inputs

```python
from app.enums import AuctionStatus
auction.status = AuctionStatus.LIVE.value
```

### 3. **Repository Pattern**
- Clean separation of data access logic
- Reusable query methods
- Easy to test and mock

```python
from app.repositories import AuctionRepository
repo = AuctionRepository(db)
auction = await repo.get_by_slug("abc123")
```

### 4. **Error Handling**
- Custom exception hierarchy
- Structured logging at appropriate levels
- Meaningful error messages

```python
from app.exceptions import BidTooLowError
try:
    await place_bid(...)
except BidTooLowError as e:
    logger.warning(f"Bid rejected: {e}")
```

### 5. **Modular Architecture**
- Routes separated by concern (admin vs public)
- WebSocket logic isolated from HTTP
- Easy to extend and maintain

## 🔧 Configuration

Required environment variables in `.env`:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/auction_db

# Security
ADMIN_TOKEN=your-secure-admin-token

# Redis (for background jobs)
REDIS_URL=redis://localhost:6379/0

# CORS (comma-separated for multiple origins)
CORS_ORIGINS=["http://localhost:3000","https://yourdomain.com"]

# Application
APP_TITLE="Auction Backend"
DEBUG=false
```

## 📡 API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /auctions/{slug}` - Get auction details

### Admin Endpoints (require `x-admin-token` header)

- `GET /admin/auctions` - List all auctions
- `POST /admin/auctions` - Create new auction
- `POST /admin/auctions/{slug}/lots` - Add lot to auction
- `POST /admin/auctions/{slug}/participants` - Create participant
- `POST /admin/auctions/{slug}/status` - Update auction status
- `POST /admin/auctions/{id}/start-manual` - Manually start auction

## 🔌 WebSocket Events

### Auction Namespace (`/auction`)

**Client → Server:**
- `place_bid` - Place a bid on a lot

**Server → Client:**
- `state` - Current auction state (on connect)
- `bid_accepted` - Bid successfully placed
- `bid_rejected` - Bid rejected with reason
- `status` - Auction status changed
- `error` - General error message

### Admin Namespace (`/admin`)

For administrative real-time monitoring and control.

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auctions.py
```

## 🚀 Deployment

### Using Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:sio_app", "--host", "0.0.0.0", "--port", "8000"]
```

### Using Gunicorn (Production)

```bash
gunicorn app.main:sio_app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers 4 \
  --bind 0.0.0.0:8000
```

## 📊 Monitoring & Logging

Logs are structured and output to stdout:

```
2025-01-07 10:30:45 - auction.bids - INFO - Bid accepted: Lot abc-123, Amount 100.00
2025-01-07 10:30:50 - auction.routes.admin - INFO - Auction created: xyz-789
```

Configure log level with `DEBUG=true` in `.env`.
