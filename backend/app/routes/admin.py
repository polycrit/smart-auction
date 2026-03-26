import logging
from datetime import datetime, timedelta, timezone
from typing import List

import redis
from rq import Queue
from rq.job import Job
from rq.exceptions import NoSuchJobError
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db import get_session
from app.deps import require_admin
from app.models import Auction, Participant, Vendor, Bid, Lot
from app.schemas import (
    AuctionCreate,
    AuctionRead,
    LotCreate,
    LotRead,
    ParticipantCreate,
    AuctionStatusUpdate,
    VendorCreate,
    VendorRead,
    DashboardSummary,
    AuctionAnalytics,
    BidAnalytics,
    RevenueAnalytics,
    VendorAnalytics,
    ParticipantAnalytics,
    BidLogEntry,
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
from app.services import analytics
from app.jobs import activate_auction, end_auction

logger = logging.getLogger("auction.routes.admin")

r = redis.from_url(settings.redis_url)
q = Queue("scheduler", connection=r)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

@router.get("/auctions", response_model=List[AuctionRead])
async def list_auctions(
    db: AsyncSession = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
):
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
    auction = await create_auction(
        db, payload.title, payload.description, payload.start_time, payload.end_time
    )

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

    if payload.end_time:
        end_delay = (payload.end_time - datetime.now(timezone.utc)).total_seconds()
        if end_delay < 0:
            end_delay = 0
        q.enqueue_in(
            timedelta(seconds=end_delay),
            end_auction,
            str(auction.id),
            job_id=f"auction_end_{auction.id}",
        )
        logger.info(
            f"Auction {auction.id} scheduled to end in {end_delay}s"
        )

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
        payload.image_url,
    )
    logger.info(f"Lot created: auction={slug}, lot_number={lot.lot_number}")

    from app.websocket import sio, AUCTION_NS
    from app.services.auctions import auction_state_payload

    state = await auction_state_payload(db, auction)
    await sio.emit("state", state, room=slug, namespace=AUCTION_NS)

    return lot

@router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
):
    from app.services.s3 import upload_image as s3_upload

    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"Invalid file type. Allowed: {', '.join(allowed_types)}")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum size is 5MB")

    url = await s3_upload(content, file.content_type, file.filename or "image.jpg")
    if not url:
        raise HTTPException(500, "Failed to upload image. Check S3 configuration.")

    logger.info(f"Image uploaded: {url}")
    return {"url": url}

@router.delete("/upload/image")
async def delete_image(url: str = Query(...)):
    from app.services.s3 import delete_image as s3_delete

    success = await s3_delete(url)
    if not success:
        raise HTTPException(500, "Failed to delete image")

    logger.info(f"Image deleted: {url}")
    return {"success": True}

@router.get("/auctions/{slug}/bids", response_model=List[BidLogEntry])
async def get_auction_bids(
    slug: str,
    db: AsyncSession = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
):
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

    result = await db.execute(
        select(Bid, Lot, Participant, Vendor)
        .join(Lot, Bid.lot_id == Lot.id)
        .join(Participant, Bid.participant_id == Participant.id)
        .join(Vendor, Participant.vendor_id == Vendor.id)
        .where(Lot.auction_id == auction.id)
        .order_by(Bid.placed_at.desc())
        .limit(limit)
    )

    bids = []
    for bid, lot, participant, vendor in result.all():
        bids.append(BidLogEntry(
            id=bid.id,
            lot_id=lot.id,
            lot_number=lot.lot_number,
            lot_name=lot.name,
            vendor_name=vendor.name,
            amount=bid.amount,
            currency=lot.currency,
            placed_at=bid.placed_at,
        ))

    logger.info(f"Bid log requested: auction={slug}, count={len(bids)}")
    return bids

@router.get("/auctions/{slug}/participants")
async def list_auction_participants(
    slug: str,
    db: AsyncSession = Depends(get_session),
):
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
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

    vendor = await get_vendor_by_id(db, payload.vendor_id)
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    p = await create_participant(db, auction.id, payload.vendor_id)
    logger.info(f"Participant created: auction={slug}, vendor_id={payload.vendor_id}")

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
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

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
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

    auction = await change_auction_status(db, auction, payload.status.value)
    logger.info(f"Auction status changed: {slug} -> {auction.status}")

    if payload.status.value == "live" and auction.end_time:
        end_delay = (auction.end_time - datetime.now(timezone.utc)).total_seconds()
        if end_delay > 0:
            try:
                job = Job.fetch(f"auction_end_{auction.id}", connection=r)
                job.cancel()
            except NoSuchJobError:
                pass
            q.enqueue_in(
                timedelta(seconds=end_delay),
                end_auction,
                str(auction.id),
                job_id=f"auction_end_{auction.id}",
            )
            logger.info(f"Scheduled auto-end for auction {slug} in {end_delay}s")

    if payload.status.value == "ended":
        try:
            job = Job.fetch(f"auction_end_{auction.id}", connection=r)
            job.cancel()
            logger.info(f"Canceled scheduled end job for auction {slug}")
        except NoSuchJobError:
            pass

    from app.websocket import sio, AUCTION_NS

    await sio.emit(
        "status", {"status": auction.status}, room=slug, namespace=AUCTION_NS
    )

    return {"status": auction.status}

@router.post("/auctions/{auction_id}/start-manual")
async def start_auction_manually(auction_id: str):
    try:
        job = Job.fetch(f"auction_{auction_id}", connection=r)
        job.cancel()
        logger.info(f"Canceled scheduled start for auction {auction_id}")
    except NoSuchJobError:
        pass

    activate_auction(auction_id)
    logger.info(f"Manually started auction {auction_id}")

    return {"status": "live", "manual_start": True}

@router.delete("/auctions/{slug}")
async def delete_auction(
    slug: str,
    db: AsyncSession = Depends(get_session),
):
    auction = await get_auction_by_slug(db, slug)
    if not auction:
        raise HTTPException(404, "Auction not found")

    for job_id in [f"auction_{auction.id}", f"auction_end_{auction.id}"]:
        try:
            job = Job.fetch(job_id, connection=r)
            job.cancel()
            logger.info(f"Canceled scheduled job {job_id} for deleted auction {auction.id}")
        except NoSuchJobError:
            pass

    from app.repositories import AuctionRepository
    repo = AuctionRepository(db)
    await repo.delete(auction)

    logger.info(f"Auction deleted: {slug}")

    return {"success": True, "slug": slug}

@router.get("/vendors", response_model=List[VendorRead])
async def list_all_vendors(
    db: AsyncSession = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    vendors = await list_vendors(db, skip=skip, limit=limit)
    logger.info(f"Admin listed vendors: skip={skip}, limit={limit}, count={len(vendors)}")
    return vendors

@router.post("/vendors", response_model=VendorRead)
async def create_new_vendor(
    payload: VendorCreate,
    db: AsyncSession = Depends(get_session),
):
    vendor = await create_vendor(db, payload.name, payload.email, payload.comment)
    logger.info(f"Vendor created: id={vendor.id}, name={vendor.name}, email={vendor.email}")
    return vendor

@router.get("/vendors/{vendor_id}", response_model=VendorRead)
async def get_vendor(
    vendor_id: str,
    db: AsyncSession = Depends(get_session),
):
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

@router.get("/analytics/dashboard", response_model=DashboardSummary)
async def get_dashboard_analytics(
    db: AsyncSession = Depends(get_session),
):
    logger.info("Dashboard analytics requested")
    return await analytics.get_dashboard_summary(db)

@router.get("/analytics/auctions", response_model=AuctionAnalytics)
async def get_auction_analytics(
    db: AsyncSession = Depends(get_session),
):
    logger.info("Auction analytics requested")
    return await analytics.get_auction_analytics(db)

@router.get("/analytics/bids", response_model=BidAnalytics)
async def get_bid_analytics(
    db: AsyncSession = Depends(get_session),
):
    logger.info("Bid analytics requested")
    return await analytics.get_bid_analytics(db)

@router.get("/analytics/revenue", response_model=RevenueAnalytics)
async def get_revenue_analytics(
    db: AsyncSession = Depends(get_session),
):
    logger.info("Revenue analytics requested")
    return await analytics.get_revenue_analytics(db)

@router.get("/analytics/vendors", response_model=VendorAnalytics)
async def get_vendor_analytics(
    db: AsyncSession = Depends(get_session),
):
    logger.info("Vendor analytics requested")
    return await analytics.get_vendor_analytics(db)

@router.get("/analytics/auctions/{auction_id}/participants", response_model=ParticipantAnalytics)
async def get_auction_participant_analytics(
    auction_id: str,
    db: AsyncSession = Depends(get_session),
):
    logger.info(f"Participant analytics requested for auction: {auction_id}")
    return await analytics.get_participant_analytics(auction_id, db)
