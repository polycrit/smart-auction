from datetime import datetime
from app.db import SessionLocal
from app.models import Auction


async def activate_auction(auction_id: str):
    """Activates auction and notifies clients."""
    async with SessionLocal() as session:
        auction = await session.get(Auction, auction_id)
        if not auction:
            print(f"[JOB] Auction {auction_id} not found")
            return

        if auction.status in ("draft", "paused"):
            auction.status = "live"
            auction.start_time = datetime.utcnow()
            await session.commit()
            print(f"[JOB] Auction {auction_id} auto-started at {datetime.utcnow()}")

            # Lazy import to avoid circular import
            from app.main import sio

            await sio.emit(
                "auction_status_changed",
                {
                    "auction_id": str(auction_id),
                    "status": "live",
                    "started_at": auction.start_time.isoformat(),
                },
                namespace="/auction",
            )
