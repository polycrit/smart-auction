from __future__ import annotations
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timedelta
from typing import List
import json
from urllib.parse import parse_qs

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

import redis
from rq import Queue
from rq.job import Job
from rq.exceptions import NoSuchJobError

from app.db import get_session, SessionLocal
from app.models import Auction, Participant, Lot
from app.schemas import (
    AuctionCreate,
    AuctionRead,
    LotCreate,
    ParticipantCreate,
    AuctionStatusUpdate,
    LotRead,
)
from app.deps import require_admin
from app.services.auctions import (
    create_auction,
    get_auction_by_slug,
    create_participant,
    create_lot,
    change_auction_status,
    get_participant_by_token,
    auction_state_payload,
)
from app.services.bids import place_bid, BidTooLow, LotNotLive
from app.jobs import activate_auction
from app.custom_json import CustomJSONEncoder

# ------------------------------------------------------------------------------
# Redis + RQ Configuration
# ------------------------------------------------------------------------------
REDIS_URL = "redis://localhost:6379/0"  # or use os.getenv("REDIS_URL")
r = redis.from_url(REDIS_URL)
q = Queue("scheduler", connection=r)

# ------------------------------------------------------------------------------
# FastAPI app
# ------------------------------------------------------------------------------
app = FastAPI(title="Auction Backend")

# CORS for local dev (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"ok": True}


# ------------------------------------------------------------------------------
# ADMIN ROUTES
# ------------------------------------------------------------------------------


@app.get("/admin/auctions", response_model=List[AuctionRead])
async def admin_list_auctions(
    db=Depends(get_session), _: None = Depends(require_admin)
):
    rows = (
        (
            await db.execute(
                select(Auction)
                .options(selectinload(Auction.lots))
                .order_by(Auction.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return rows


@app.post("/admin/auctions")
async def admin_create_auction(
    payload: AuctionCreate,
    db: AsyncSession = Depends(get_session),
    _: None = Depends(require_admin),
):
    auction = await create_auction(
        db, payload.title, payload.description, payload.start_time, payload.end_time
    )

    # ─── Schedule automatic activation if start_time exists ────────────────
    if payload.start_time:
        delay = (payload.start_time - datetime.utcnow()).total_seconds()
        if delay < 0:
            delay = 0
        q.enqueue_in(
            timedelta(seconds=delay),
            activate_auction,
            auction.id,
            job_id=f"auction_{auction.id}",
        )

    return {
        "id": str(auction.id),
        "slug": auction.slug,
        "public_url": f"/a/{auction.slug}",
        "admin_ws_url": f"/socket.io?EIO=4&transport=websocket&ns=/admin&slug={auction.slug}",
    }


@app.post("/admin/auctions/{slug}/lots", response_model=LotRead)
async def admin_create_lot(
    slug: str,
    payload: LotCreate,
    db: AsyncSession = Depends(get_session),
    _: None = Depends(require_admin),
):
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")
    lot = await create_lot(
        db,
        auction.id,
        payload.lot_number,
        payload.name,
        payload.base_price,
        payload.min_increment,
        payload.currency,
    )
    return lot


@app.post("/admin/auctions/{slug}/participants")
async def admin_create_participant(
    slug: str,
    payload: ParticipantCreate,
    db: AsyncSession = Depends(get_session),
    _: None = Depends(require_admin),
):
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")
    p = await create_participant(db, auction.id, payload.display_name)
    return {
        "id": str(p.id),
        "display_name": p.display_name,
        "join_url": f"/a/{slug}?t={p.invite_token}",
        "invite_token": p.invite_token,
    }


@app.post("/admin/auctions/{slug}/status")
async def admin_status(
    slug: str,
    payload: AuctionStatusUpdate,
    db: AsyncSession = Depends(get_session),
    _: None = Depends(require_admin),
):
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")
    auction = await change_auction_status(db, auction, payload.status)
    await sio.emit(
        "status", {"status": auction.status}, room=slug, namespace="/auction"
    )
    return {"status": auction.status}


@app.post("/admin/auctions/{auction_id}/start-manual")
async def start_now(auction_id: str):
    """Manually start an auction immediately."""
    try:
        job = Job.fetch(f"auction_{auction_id}", connection=r)
        job.cancel()
    except NoSuchJobError:
        pass

    await activate_auction(auction_id)
    return {"status": "live", "manual_start": True}


# ------------------------------------------------------------------------------
# PUBLIC ROUTES
# ------------------------------------------------------------------------------


@app.get("/auctions/{slug}", response_model=AuctionRead)
async def public_get_auction(slug: str, db=Depends(get_session)):
    result = await db.execute(
        select(Auction).options(selectinload(Auction.lots)).where(Auction.slug == slug)
    )
    auction = result.scalar_one_or_none()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


# ------------------------------------------------------------------------------
# SOCKET.IO SETUP
# ------------------------------------------------------------------------------
import socketio

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    json=json,
    json_dumps_options={"cls": CustomJSONEncoder},
)
AUCTION_NS = "/auction"
ADMIN_NS = "/admin"


@sio.event(namespace=AUCTION_NS)
async def connect(sid, environ, auth):
    qs = parse_qs(environ.get("QUERY_STRING", ""))
    slug = (auth or {}).get("slug") or (qs.get("slug") or [None])[0]
    token = (auth or {}).get("t") or (qs.get("t") or [None])[0]

    if not slug:
        return False

    async with SessionLocal() as db:
        auction = await get_auction_by_slug(db, slug)
        if not auction:
            return False

        participant = None
        if token:
            participant = await get_participant_by_token(db, token)
            if (
                not participant
                or participant.auction_id != auction.id
                or participant.blocked
            ):
                return False

        await sio.save_session(
            sid,
            {
                "slug": slug,
                "participant_id": str(participant.id) if participant else None,
            },
            namespace=AUCTION_NS,
        )
        await sio.enter_room(sid, slug, namespace=AUCTION_NS)

        payload = await auction_state_payload(db, auction)
        await sio.emit("state", payload, to=sid, namespace=AUCTION_NS)


@sio.event(namespace=AUCTION_NS)
async def disconnect(sid):
    sess = await sio.get_session(sid, namespace=AUCTION_NS)
    if not sess:
        return


@sio.on("place_bid", namespace=AUCTION_NS)
async def place_bid_evt(sid, data):
    sess = await sio.get_session(sid, namespace=AUCTION_NS)
    if not sess or not sess.get("participant_id"):
        await sio.emit(
            "error",
            {"detail": "Auth required to place bids"},
            to=sid,
            namespace=AUCTION_NS,
        )
        return

    slug = sess["slug"]
    participant_id = UUID(sess["participant_id"])
    lot_id = UUID(data.get("lot_id"))
    amount = Decimal(str(data.get("amount")))

    async with SessionLocal() as db:
        try:
            payload = await place_bid(
                db, lot_id=lot_id, participant_id=participant_id, amount=amount
            )
            await sio.emit("bid_accepted", payload, room=slug, namespace=AUCTION_NS)
        except BidTooLow as e:
            await sio.emit(
                "bid_rejected", {"reason": str(e)}, to=sid, namespace=AUCTION_NS
            )
        except LotNotLive:
            await sio.emit(
                "bid_rejected", {"reason": "Lot not live"}, to=sid, namespace=AUCTION_NS
            )
        except Exception:
            await sio.emit(
                "error", {"detail": "Internal error"}, to=sid, namespace=AUCTION_NS
            )


# --- Admin namespace (optional realtime controls) ---
@sio.event(namespace=ADMIN_NS)
async def connect(sid, environ, auth):
    return True


# ------------------------------------------------------------------------------
# ASGI App (FastAPI + Socket.IO)
# ------------------------------------------------------------------------------
sio_app = socketio.ASGIApp(sio, other_asgi_app=app)
