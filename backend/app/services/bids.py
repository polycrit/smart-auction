from __future__ import annotations
import logging
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Lot, Bid
from app.exceptions import BidTooLowError, LotNotLiveError

logger = logging.getLogger("auction.bids")


async def place_bid(
    db: AsyncSession, lot_id: UUID, participant_id: UUID, amount: Decimal
) -> dict:
    # 1) Lock the lot row and load auction
    lot = (
        await db.execute(
            select(Lot)
            .where(Lot.id == lot_id)
            .with_for_update()
        )
    ).scalar_one()

    # Load auction to check its status
    from app.models import Auction
    auction = (
        await db.execute(select(Auction).where(Auction.id == lot.auction_id))
    ).scalar_one()

    if auction.status != "live":
        logger.warning(f"Bid rejected: Auction is not live (status={auction.status})")
        raise LotNotLiveError("Auction not live")

    current = Decimal(str(lot.current_price or 0))
    base = Decimal(str(lot.base_price or 0))
    step = Decimal(str(lot.min_increment or 1))
    min_required = max(base, current + step)

    if Decimal(str(amount)) < min_required:
        logger.warning(
            f"Bid rejected: Amount {amount} is below minimum {min_required} for lot {lot_id}"
        )
        raise BidTooLowError(f"min_required={min_required}")

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

    logger.info(
        f"Bid accepted: Lot {lot_id}, Amount {amount}, Participant {participant_id}"
    )

    return {
        "type": "bid_accepted",
        "lot_id": str(lot_id),
        "amount": str(amount),
        "leader": str(participant_id),
        "ends_at": lot.end_time.isoformat() if lot.end_time else None,
    }
