"""
Main FastAPI application entry point.
Sets up the application, middleware, routes, and WebSocket integration.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from app.config import settings
from app.logging_config import setup_logging
from app.routes import admin, public, auth
from app.websocket import sio
from app.db import SessionLocal

logger = logging.getLogger("auction.main")

# Initialize logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: ensure master admin exists
    from app.services.auth import ensure_master_admin

    async with SessionLocal() as db:
        await ensure_master_admin(db)
        logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Application shutdown")


# Create FastAPI application
app = FastAPI(title=settings.app_title, debug=settings.debug, lifespan=lifespan)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health():
    """Health check endpoint for monitoring."""
    return {"ok": True}

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(public.router)

# Create ASGI app with Socket.IO
sio_app = socketio.ASGIApp(sio, other_asgi_app=app)
