from __future__ import annotations
from uuid import uuid4, UUID
from datetime import datetime
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Auction, Participant, Lot
from sqlalchemy.orm import selectinload
from app.utils import generate_slug, generate_token, to_iso_string


async def create_auction(
    db: AsyncSession, title: str, description: Optional[str], start_time, end_time
) -> Auction:
    # ensure unique slug with retry logic
    for attempt in range(5):
        slug = generate_slug()
        exists = await db.scalar(select(Auction.id).where(Auction.slug == slug))
        if not exists:
            break
    else:
        raise RuntimeError("Could not generate unique slug after 5 attempts")

    auction = Auction(
        id=uuid4(),
        slug=slug,
        title=title,
        description=description,
        start_time=start_time,
        end_time=end_time,
        status="draft",
    )
    db.add(auction)
    await db.commit()
    await db.refresh(auction)
    return auction


async def get_auction_by_slug(db: AsyncSession, slug: str) -> Optional[Auction]:
    return await db.scalar(select(Auction).where(Auction.slug == slug))


async def get_participant_by_token(db: AsyncSession, token: str) -> Optional[Participant]:
    return await db.scalar(select(Participant).where(Participant.invite_token == token))


async def create_participant(
    db: AsyncSession, auction_id: UUID, vendor_id: UUID
) -> Participant:
    token = generate_token()
    p = Participant(
        id=uuid4(),
        auction_id=auction_id,
        invite_token=token,
        vendor_id=vendor_id,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


async def create_lot(
    db: AsyncSession,
    auction_id: UUID,
    name: str,
    base_price,
    min_increment,
    currency: str,
    image_url: Optional[str] = None,
) -> Lot:
    # Auto-calculate lot number: find max lot_number for this auction and add 1
    max_lot_number = (
        await db.execute(
            select(func.max(Lot.lot_number)).where(Lot.auction_id == auction_id)
        )
    ).scalar_one()

    lot_number = (max_lot_number or 0) + 1

    lot = Lot(
        id=uuid4(),
        auction_id=auction_id,
        lot_number=lot_number,
        name=name,
        base_price=base_price,
        min_increment=min_increment,
        currency=currency,
        current_price=base_price,
        image_url=image_url,
    )
    db.add(lot)
    await db.commit()
    await db.refresh(lot)
    return lot


async def change_auction_status(
    db: AsyncSession, auction: Auction, status: str
) -> Auction:
    auction.status = status
    await db.commit()
    await db.refresh(auction)
    return auction


async def auction_state_payload(db: AsyncSession, auction: Auction) -> dict:
    result = await db.execute(
        select(Auction)
        .where(Auction.id == auction.id)
        .options(
            selectinload(Auction.lots),
        )
    )
    auction_with_data = result.scalar_one()

    participants_count = (
        await db.execute(
            select(func.count(Participant.id)).where(
                Participant.auction_id == auction.id,
                Participant.blocked == False,
            )
        )
    ).scalar_one()

    return {
        "auction": {
            "slug": auction_with_data.slug,
            "title": auction_with_data.title,
            "status": auction_with_data.status,
            "start_time": to_iso_string(auction_with_data.start_time),
            "end_time": to_iso_string(auction_with_data.end_time),
        },
        "lots": [
            {
                "id": str(l.id),
                "lot_number": l.lot_number,
                "name": l.name,
                "currency": l.currency,
                "current_price": str(l.current_price),
                "current_leader": str(l.current_leader) if l.current_leader else None,
                "end_time": to_iso_string(l.end_time),
                "image_url": l.image_url,
                "base_price": str(l.base_price),
                "min_increment": str(l.min_increment),
            }
            for l in auction_with_data.lots
        ],
        "participants": {"count": int(participants_count)},
    }
