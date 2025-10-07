from __future__ import annotations
import secrets, string
from uuid import uuid4, UUID
from datetime import datetime
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Auction, Participant, Lot

_ALPHABET = string.ascii_letters + string.digits


def gen_slug(n: int = 9) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(n))


def gen_token(n: int = 22) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(n))


async def create_auction(
    db: AsyncSession, title: str, description: str | None, start_time, end_time
) -> Auction:
    # ensure unique slug
    for _ in range(5):
        slug = gen_slug()
        exists = await db.scalar(select(Auction.id).where(Auction.slug == slug))
        if not exists:
            break
    else:
        raise RuntimeError("Could not generate unique slug")

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


async def get_auction_by_slug(db: AsyncSession, slug: str) -> Auction | None:
    return await db.scalar(select(Auction).where(Auction.slug == slug))


async def get_participant_by_token(db: AsyncSession, token: str) -> Participant | None:
    return await db.scalar(select(Participant).where(Participant.invite_token == token))


async def create_participant(
    db: AsyncSession, auction_id: UUID, display_name: str
) -> Participant:
    token = gen_token()
    p = Participant(
        id=uuid4(), auction_id=auction_id, display_name=display_name, invite_token=token
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


async def create_lot(
    db: AsyncSession,
    auction_id: UUID,
    lot_number: int,
    name: str,
    base_price,
    min_increment,
    currency: str,
) -> Lot:
    lot = Lot(
        id=uuid4(),
        auction_id=auction_id,
        lot_number=lot_number,
        name=name,
        base_price=base_price,
        min_increment=min_increment,
        currency=currency,
        status="ready",
        current_price=base_price,
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


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


async def auction_state_payload(db: AsyncSession, auction: Auction) -> dict:
    # Load lots explicitly (avoid lazy-loading in async)
    lots = (
        (
            await db.execute(
                select(Lot).where(Lot.auction_id == auction.id).order_by(Lot.lot_number)
            )
        )
        .scalars()
        .all()
    )

    # Count participants (SQLAlchemy 2.x style)
    participants_count = (
        await db.execute(
            select(func.count(Participant.id)).where(
                Participant.auction_id == auction.id,
                Participant.blocked == False,  # noqa: E712
            )
        )
    ).scalar_one()

    return {
        "auction": {
            "slug": auction.slug,
            "title": auction.title,
            "status": auction.status,
            "start_time": _iso(auction.start_time),
            "end_time": _iso(auction.end_time),
        },
        "lots": [
            {
                "id": str(l.id),
                "lot_number": l.lot_number,
                "name": l.name,
                "currency": l.currency,
                "status": l.status,
                "current_price": str(l.current_price),  # Decimal -> string
                "current_leader": str(l.current_leader) if l.current_leader else None,
                "end_time": _iso(l.end_time),  # datetime -> ISO
            }
            for l in lots
        ],
        "participants": {"count": int(participants_count)},
    }
