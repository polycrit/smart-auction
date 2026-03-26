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

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.auth import ensure_master_admin

    async with SessionLocal() as db:
        await ensure_master_admin(db)
        logger.info("Application startup complete")

    yield

    logger.info("Application shutdown")

app = FastAPI(title=settings.app_title, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True}

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(public.router)

sio_app = socketio.ASGIApp(sio, other_asgi_app=app)
