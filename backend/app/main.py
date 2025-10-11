"""
Main FastAPI application entry point.
Sets up the application, middleware, routes, and WebSocket integration.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from app.config import settings
from app.logging_config import setup_logging
from app.routes import admin, public
from app.websocket import sio

# Initialize logging
setup_logging()

# Create FastAPI application
app = FastAPI(title=settings.app_title, debug=settings.debug)

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
app.include_router(admin.router)
app.include_router(public.router)

# Create ASGI app with Socket.IO
sio_app = socketio.ASGIApp(sio, other_asgi_app=app)
