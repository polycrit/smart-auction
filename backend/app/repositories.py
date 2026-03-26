from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models import Auction, Participant, Lot, Bid

class AuctionRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, auction_id: UUID) -> Optional[Auction]:
        return await self.db.get(Auction, auction_id)

    async def get_by_slug(self, slug: str) -> Optional[Auction]:
        return await self.db.scalar(select(Auction).where(Auction.slug == slug))

    async def get_by_slug_with_lots(self, slug: str) -> Optional[Auction]:
        result = await self.db.execute(
            select(Auction)
            .where(Auction.slug == slug)
            .options(selectinload(Auction.lots))
        )
        return result.scalar_one_or_none()

    async def list_all(self, skip: int = 0, limit: int = 10) -> List[Auction]:
        result = await self.db.execute(
            select(Auction)
            .options(selectinload(Auction.lots))
            .order_by(Auction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, auction: Auction) -> Auction:
        self.db.add(auction)
        await self.db.commit()
        await self.db.refresh(auction)
        return auction

    async def update(self, auction: Auction) -> Auction:
        await self.db.commit()
        await self.db.refresh(auction)
        return auction

    async def slug_exists(self, slug: str) -> bool:
        result = await self.db.scalar(select(Auction.id).where(Auction.slug == slug))
        return result is not None

    async def delete(self, auction: Auction) -> None:
        await self.db.delete(auction)
        await self.db.commit()

class ParticipantRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, participant_id: UUID) -> Optional[Participant]:
        return await self.db.get(Participant, participant_id)

    async def get_by_token(self, token: str) -> Optional[Participant]:
        return await self.db.scalar(
            select(Participant).where(Participant.invite_token == token)
        )

    async def count_by_auction(self, auction_id: UUID, exclude_blocked: bool = True) -> int:
        query = select(func.count(Participant.id)).where(
            Participant.auction_id == auction_id
        )
        if exclude_blocked:
            query = query.where(Participant.blocked == False)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def create(self, participant: Participant) -> Participant:
        self.db.add(participant)
        await self.db.commit()
        await self.db.refresh(participant)
        return participant

class LotRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, lot_id: UUID) -> Optional[Lot]:
        return await self.db.get(Lot, lot_id)

    async def get_by_id_for_update(self, lot_id: UUID) -> Optional[Lot]:
        result = await self.db.execute(
            select(Lot).where(Lot.id == lot_id).with_for_update()
        )
        return result.scalar_one_or_none()

    async def create(self, lot: Lot) -> Lot:
        self.db.add(lot)
        await self.db.commit()
        await self.db.refresh(lot)
        return lot

    async def update(self, lot: Lot) -> Lot:
        await self.db.commit()
        await self.db.refresh(lot)
        return lot

class BidRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, bid: Bid) -> Bid:
        self.db.add(bid)
        await self.db.commit()
        await self.db.refresh(bid)
        return bid
