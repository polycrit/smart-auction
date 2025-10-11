"""
Admin API routes for auction management.
These endpoints require admin authentication.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import List

import redis
from rq import Queue
from rq.job import Job
from rq.exceptions import NoSuchJobError
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db import get_session
from app.deps import require_admin
from app.models import Auction, Participant, Vendor
from app.schemas import (
    AuctionCreate,
    AuctionRead,
    LotCreate,
    LotRead,
    ParticipantCreate,
    AuctionStatusUpdate,
    VendorCreate,
    VendorRead,
)
from app.services.auctions import (
    create_auction,
    get_auction_by_slug,
    create_participant,
    create_lot,
    change_auction_status,
)
from app.services.vendors import (
    create_vendor,
    get_vendor_by_id,
    list_vendors,
    update_vendor,
    delete_vendor,
)
from app.jobs import activate_auction

logger = logging.getLogger("auction.routes.admin")

# Redis & RQ setup
r = redis.from_url(settings.redis_url)
q = Queue("scheduler", connection=r)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/auctions", response_model=List[AuctionRead])
async def list_auctions(
    db: AsyncSession = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
):
    """List all auctions with pagination."""
    rows = (
        (
            await db.execute(
                select(Auction)
                .options(selectinload(Auction.lots))
                .order_by(Auction.created_at.desc())
                .offset(skip)
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    logger.info(f"Admin listed auctions: skip={skip}, limit={limit}, count={len(rows)}")
    return list(rows)


@router.post("/auctions")
async def create_new_auction(
    payload: AuctionCreate,
    db: AsyncSession = Depends(get_session),
):
    """Create a new auction and optionally schedule automatic activation."""
    auction = await create_auction(
        db, payload.title, payload.description, payload.start_time, payload.end_time
    )

    # Schedule automatic activation if start_time exists
    if payload.start_time:
        delay = (payload.start_time - datetime.now(timezone.utc)).total_seconds()
        if delay < 0:
            delay = 0
        q.enqueue_in(
            timedelta(seconds=delay),
            activate_auction,
            str(auction.id),
            job_id=f"auction_{auction.id}",
        )
        logger.info(
            f"Auction {auction.id} created and scheduled to start in {delay}s"
        )
    else:
        logger.info(f"Auction {auction.id} created without scheduled start")

    return {
        "id": str(auction.id),
        "slug": auction.slug,
        "public_url": f"/a/{auction.slug}",
        "admin_ws_url": f"/socket.io?EIO=4&transport=websocket&ns=/admin&slug={auction.slug}",
    }


@router.post("/auctions/{slug}/lots", response_model=LotRead)
async def create_auction_lot(
    slug: str,
    payload: LotCreate,
    db: AsyncSession = Depends(get_session),
):
    """Create a new lot for an auction."""
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

    lot = await create_lot(
        db,
        auction.id,
        payload.name,
        payload.base_price,
        payload.min_increment,
        payload.currency.value,
    )
    logger.info(f"Lot created: auction={slug}, lot_number={lot.lot_number}")

    # Broadcast updated state to all connected clients
    from app.websocket import sio, AUCTION_NS
    from app.services.auctions import auction_state_payload

    state = await auction_state_payload(db, auction)
    await sio.emit("state", state, room=slug, namespace=AUCTION_NS)

    return lot


@router.get("/auctions/{slug}/participants")
async def list_auction_participants(
    slug: str,
    db: AsyncSession = Depends(get_session),
):
    """List all participants for an auction."""
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

    participants = (
        await db.execute(
            select(Participant)
            .where(Participant.auction_id == auction.id)
            .options(selectinload(Participant.vendor))
        )
    ).scalars().all()

    return [
        {
            "id": str(p.id),
            "join_url": f"/a/{slug}?t={p.invite_token}",
            "invite_token": p.invite_token,
            "vendor": {
                "id": str(p.vendor.id),
                "name": p.vendor.name,
                "email": p.vendor.email,
            },
        }
        for p in participants
    ]


@router.post("/auctions/{slug}/participants")
async def create_auction_participant(
    slug: str,
    payload: ParticipantCreate,
    db: AsyncSession = Depends(get_session),
):
    """Create a new participant for an auction."""
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

    # Validate vendor
    vendor = await get_vendor_by_id(db, payload.vendor_id)
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    p = await create_participant(db, auction.id, payload.vendor_id)
    logger.info(f"Participant created: auction={slug}, vendor_id={payload.vendor_id}")

    # Load vendor for response
    await db.refresh(p, attribute_names=["vendor"])

    return {
        "id": str(p.id),
        "join_url": f"/a/{slug}?t={p.invite_token}",
        "invite_token": p.invite_token,
        "vendor": {
            "id": str(p.vendor.id),
            "name": p.vendor.name,
            "email": p.vendor.email,
        },
    }


@router.delete("/auctions/{slug}/participants/{participant_id}")
async def delete_auction_participant(
    slug: str,
    participant_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Delete a participant from an auction."""
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

    # Find the participant
    from uuid import UUID
    try:
        participant_uuid = UUID(participant_id)
    except ValueError:
        raise HTTPException(400, "Invalid participant ID")

    participant = await db.scalar(
        select(Participant).where(
            Participant.id == participant_uuid,
            Participant.auction_id == auction.id
        )
    )

    if not participant:
        raise HTTPException(404, "Participant not found")

    await db.delete(participant)
    await db.commit()
    logger.info(f"Participant deleted: auction={slug}, id={participant_id}")

    return {"success": True, "id": participant_id}


@router.post("/auctions/{slug}/status")
async def update_auction_status(
    slug: str,
    payload: AuctionStatusUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Update auction status (draft/live/paused/ended)."""
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

    auction = await change_auction_status(db, auction, payload.status.value)
    logger.info(f"Auction status changed: {slug} -> {auction.status}")

    # Notify clients via WebSocket
    from app.websocket import sio, AUCTION_NS

    await sio.emit(
        "status", {"status": auction.status}, room=slug, namespace=AUCTION_NS
    )

    return {"status": auction.status}


@router.post("/auctions/{auction_id}/start-manual")
async def start_auction_manually(auction_id: str):
    """Manually start an auction immediately, canceling any scheduled start."""
    try:
        job = Job.fetch(f"auction_{auction_id}", connection=r)
        job.cancel()
        logger.info(f"Canceled scheduled start for auction {auction_id}")
    except NoSuchJobError:
        pass

    # Call the synchronous wrapper
    activate_auction(auction_id)
    logger.info(f"Manually started auction {auction_id}")

    return {"status": "live", "manual_start": True}


@router.delete("/auctions/{slug}")
async def delete_auction(
    slug: str,
    db: AsyncSession = Depends(get_session),
):
    """Delete an auction and all related data (lots, participants, bids)."""
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

    # Cancel any scheduled start job
    try:
        job = Job.fetch(f"auction_{auction.id}", connection=r)
        job.cancel()
        logger.info(f"Canceled scheduled job for deleted auction {auction.id}")
    except NoSuchJobError:
        pass

    # Delete auction (cascades to all related records)
    from app.repositories import AuctionRepository
    repo = AuctionRepository(db)
    await repo.delete(auction)

    logger.info(f"Auction deleted: {slug}")

    return {"success": True, "slug": slug}


# ============================================================================
# Vendor Management Routes
# ============================================================================


@router.get("/vendors", response_model=List[VendorRead])
async def list_all_vendors(
    db: AsyncSession = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """List all vendors with pagination."""
    vendors = await list_vendors(db, skip=skip, limit=limit)
    logger.info(f"Admin listed vendors: skip={skip}, limit={limit}, count={len(vendors)}")
    return vendors


@router.post("/vendors", response_model=VendorRead)
async def create_new_vendor(
    payload: VendorCreate,
    db: AsyncSession = Depends(get_session),
):
    """Create a new vendor."""
    vendor = await create_vendor(db, payload.name, payload.email, payload.comment)
    logger.info(f"Vendor created: id={vendor.id}, name={vendor.name}, email={vendor.email}")
    return vendor


@router.get("/vendors/{vendor_id}", response_model=VendorRead)
async def get_vendor(
    vendor_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Get a single vendor by ID."""
    from uuid import UUID
    try:
        vendor_uuid = UUID(vendor_id)
    except ValueError:
        raise HTTPException(400, "Invalid vendor ID")

    vendor = await get_vendor_by_id(db, vendor_uuid)
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    return vendor


@router.put("/vendors/{vendor_id}", response_model=VendorRead)
async def update_existing_vendor(
    vendor_id: str,
    payload: VendorCreate,
    db: AsyncSession = Depends(get_session),
):
    """Update a vendor."""
    from uuid import UUID
    try:
        vendor_uuid = UUID(vendor_id)
    except ValueError:
        raise HTTPException(400, "Invalid vendor ID")

    vendor = await update_vendor(
        db, vendor_uuid, payload.name, payload.email, payload.comment
    )
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    logger.info(f"Vendor updated: id={vendor_id}")
    return vendor


@router.delete("/vendors/{vendor_id}")
async def delete_existing_vendor(
    vendor_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Delete a vendor."""
    from uuid import UUID
    try:
        vendor_uuid = UUID(vendor_id)
    except ValueError:
        raise HTTPException(400, "Invalid vendor ID")

    success = await delete_vendor(db, vendor_uuid)
    if not success:
        raise HTTPException(404, "Vendor not found")

    logger.info(f"Vendor deleted: id={vendor_id}")
    return {"success": True, "id": vendor_id}
