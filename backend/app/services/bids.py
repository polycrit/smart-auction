from __future__ import annotations
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Lot, Bid


class BidTooLow(Exception): ...


class LotNotLive(Exception): ...


async def place_bid(
    db: AsyncSession, lot_id: UUID, participant_id: UUID, amount: Decimal
) -> dict:
    # 1) Lock the lot row
    lot = (
        await db.execute(select(Lot).where(Lot.id == lot_id).with_for_update())
    ).scalar_one()

    if lot.status != "live":
        raise LotNotLive("Lot not live")

    current = Decimal(str(lot.current_price or 0))
    base = Decimal(str(lot.base_price or 0))
    step = Decimal(str(lot.min_increment or 1))
    min_required = max(base, current + step)

    if Decimal(str(amount)) < min_required:
        raise BidTooLow(f"min_required={min_required}")

    # 2) Insert bid
    bid = Bid(
        id=uuid4(),
        lot_id=lot_id,
        participant_id=participant_id,
        amount=amount,
        placed_at=datetime.now(timezone.utc),
    )
    db.add(bid)

    # 3) Update lot cache
    lot.current_price = amount
    lot.current_leader = participant_id

    # 4) Anti-sniping (optional)
    if lot.end_time and (lot.extension_sec or 0) > 0:
        now = datetime.now(timezone.utc)
        remaining = (lot.end_time - now).total_seconds()
        if remaining < max(5, lot.extension_sec // 2):
            lot.end_time = lot.end_time + timedelta(seconds=lot.extension_sec)

    await db.commit()

    return {
        "type": "bid_accepted",
        "lot_id": str(lot_id),
        "amount": str(amount),
        "leader": str(participant_id),
        "ends_at": lot.end_time.isoformat() if lot.end_time else None,
    }
