
import asyncio
from datetime import datetime, timezone
from uuid import UUID
from app.db import SessionLocal
from app.models import Auction
from app.enums import AuctionStatus
import logging

logger = logging.getLogger("auction.jobs")

async def activate_auction(auction_id: str):
    try:
        auction_uuid = UUID(auction_id)
    except ValueError:
        logger.error(f"Invalid auction ID format: {auction_id}")
        return

    async with SessionLocal() as session:
        auction = await session.get(Auction, auction_uuid)
        if not auction:
            logger.error(f"Auction {auction_id} not found")
            return

        if auction.status in (AuctionStatus.DRAFT.value, AuctionStatus.PAUSED.value):
            auction.status = AuctionStatus.LIVE.value
            auction.start_time = datetime.now(timezone.utc)
            await session.commit()
            logger.info(
                f"Auction {auction_id} auto-started at {datetime.now(timezone.utc)}"
            )

            try:
                from app.main import sio

                await sio.emit(
                    "status",
                    {
                        "status": AuctionStatus.LIVE.value,
                        "started_at": auction.start_time.isoformat(),
                    },
                    room=auction.slug,
                    namespace="/auction",
                )
                logger.info(f"WebSocket status update sent for auction {auction.slug}")
            except Exception as e:
                logger.error(f"Failed to emit WebSocket event: {e}", exc_info=True)
        else:
            logger.warning(
                f"Auction {auction_id} is in status '{auction.status}', not starting"
            )

async def end_auction(auction_id: str):
    try:
        auction_uuid = UUID(auction_id)
    except ValueError:
        logger.error(f"Invalid auction ID format: {auction_id}")
        return

    async with SessionLocal() as session:
        auction = await session.get(Auction, auction_uuid)
        if not auction:
            logger.error(f"Auction {auction_id} not found")
            return

        if auction.status == AuctionStatus.LIVE.value:
            auction.status = AuctionStatus.ENDED.value
            await session.commit()
            logger.info(
                f"Auction {auction_id} auto-ended at {datetime.now(timezone.utc)}"
            )

            try:
                from app.websocket import sio, AUCTION_NS

                await sio.emit(
                    "status",
                    {"status": AuctionStatus.ENDED.value},
                    room=auction.slug,
                    namespace=AUCTION_NS,
                )
                logger.info(f"WebSocket end status sent for auction {auction.slug}")
            except Exception as e:
                logger.error(f"Failed to emit WebSocket event: {e}", exc_info=True)
        else:
            logger.warning(
                f"Auction {auction_id} is in status '{auction.status}', not ending"
            )
