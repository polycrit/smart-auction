"""
Repository pattern for data access layer.
Centralizes database queries and reduces duplication.
"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models import Auction, Participant, Lot, Bid


class AuctionRepository:
    """Repository for auction-related database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, auction_id: UUID) -> Optional[Auction]:
        """Get auction by ID."""
        return await self.db.get(Auction, auction_id)

    async def get_by_slug(self, slug: str) -> Optional[Auction]:
        """Get auction by slug."""
        return await self.db.scalar(select(Auction).where(Auction.slug == slug))

    async def get_by_slug_with_lots(self, slug: str) -> Optional[Auction]:
        """Get auction by slug with lots eagerly loaded."""
        result = await self.db.execute(
            select(Auction)
            .where(Auction.slug == slug)
            .options(selectinload(Auction.lots))
        )
        return result.scalar_one_or_none()

    async def list_all(self, skip: int = 0, limit: int = 10) -> List[Auction]:
        """List all auctions with pagination."""
        result = await self.db.execute(
            select(Auction)
            .options(selectinload(Auction.lots))
            .order_by(Auction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, auction: Auction) -> Auction:
        """Create new auction."""
        self.db.add(auction)
        await self.db.commit()
        await self.db.refresh(auction)
        return auction

    async def update(self, auction: Auction) -> Auction:
        """Update existing auction."""
        await self.db.commit()
        await self.db.refresh(auction)
        return auction

    async def slug_exists(self, slug: str) -> bool:
        """Check if slug already exists."""
        result = await self.db.scalar(select(Auction.id).where(Auction.slug == slug))
        return result is not None

    async def delete(self, auction: Auction) -> None:
        """Delete auction (cascades to lots, participants, and bids)."""
        await self.db.delete(auction)
        await self.db.commit()


class ParticipantRepository:
    """Repository for participant-related database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, participant_id: UUID) -> Optional[Participant]:
        """Get participant by ID."""
        return await self.db.get(Participant, participant_id)

    async def get_by_token(self, token: str) -> Optional[Participant]:
        """Get participant by invite token."""
        return await self.db.scalar(
            select(Participant).where(Participant.invite_token == token)
        )

    async def count_by_auction(self, auction_id: UUID, exclude_blocked: bool = True) -> int:
        """Count participants for an auction."""
        query = select(func.count(Participant.id)).where(
            Participant.auction_id == auction_id
        )
        if exclude_blocked:
            query = query.where(Participant.blocked == False)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def create(self, participant: Participant) -> Participant:
        """Create new participant."""
        self.db.add(participant)
        await self.db.commit()
        await self.db.refresh(participant)
        return participant


class LotRepository:
    """Repository for lot-related database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, lot_id: UUID) -> Optional[Lot]:
        """Get lot by ID."""
        return await self.db.get(Lot, lot_id)

    async def get_by_id_for_update(self, lot_id: UUID) -> Optional[Lot]:
        """Get lot by ID with row lock for updates (prevents race conditions)."""
        result = await self.db.execute(
            select(Lot).where(Lot.id == lot_id).with_for_update()
        )
        return result.scalar_one_or_none()

    async def create(self, lot: Lot) -> Lot:
        """Create new lot."""
        self.db.add(lot)
        await self.db.commit()
        await self.db.refresh(lot)
        return lot

    async def update(self, lot: Lot) -> Lot:
        """Update existing lot."""
        await self.db.commit()
        await self.db.refresh(lot)
        return lot


class BidRepository:
    """Repository for bid-related database operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, bid: Bid) -> Bid:
        """Create new bid."""
        self.db.add(bid)
        await self.db.commit()
        await self.db.refresh(bid)
        return bid
