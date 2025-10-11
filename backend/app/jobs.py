"""
Background jobs for auction automation.
Note: RQ is synchronous, so these functions must be synchronous wrappers around async code.
"""
import asyncio
from datetime import datetime, timezone
from uuid import UUID
from app.db import SessionLocal
from app.models import Auction
from app.enums import AuctionStatus


def activate_auction(auction_id: str):
    """
    Synchronous wrapper to activate an auction (called by RQ worker).
    Activates auction and notifies clients via Socket.IO.
    """
    asyncio.run(_activate_auction_async(auction_id))


async def _activate_auction_async(auction_id: str):
    """Internal async implementation of auction activation."""
    try:
        auction_uuid = UUID(auction_id)
    except ValueError:
        print(f"[JOB] Invalid auction ID format: {auction_id}")
        return

    async with SessionLocal() as session:
        auction = await session.get(Auction, auction_uuid)
        if not auction:
            print(f"[JOB] Auction {auction_id} not found")
            return

        if auction.status in (AuctionStatus.DRAFT, AuctionStatus.PAUSED):
            auction.status = AuctionStatus.LIVE
            auction.start_time = datetime.now(timezone.utc)
            await session.commit()
            print(f"[JOB] Auction {auction_id} auto-started at {datetime.now(timezone.utc)}")

            # Lazy import to avoid circular import
            from app.main import sio

            await sio.emit(
                "auction_status_changed",
                {
                    "auction_id": str(auction_id),
                    "status": AuctionStatus.LIVE.value,
                    "started_at": auction.start_time.isoformat(),
                },
                namespace="/auction",
            )
        else:
            print(f"[JOB] Auction {auction_id} is in status '{auction.status}', not starting")
