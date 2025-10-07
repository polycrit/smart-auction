from datetime import datetime
from app.db import async_session
from app.models import Auction


async def activate_auction(auction_id: str):
    async with async_session() as session:
        auction = await session.get(Auction, auction_id)
        if auction and auction.status in ("draft", "paused"):
            auction.status = "live"
            auction.start_time = datetime.utcnow()
            await session.commit()
            print(f"Auction {auction_id} activated at {datetime.utcnow()}")
