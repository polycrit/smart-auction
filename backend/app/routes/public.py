"""
Public API routes for auctions.
These endpoints are accessible without authentication.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db import get_session
from app.models import Auction
from app.schemas import AuctionRead

logger = logging.getLogger("auction.routes.public")

router = APIRouter(prefix="/auctions", tags=["public"])


@router.get("/{slug}", response_model=AuctionRead)
async def get_auction(slug: str, db: AsyncSession = Depends(get_session)):
    """
    Get public auction details by slug.
    Returns auction information including lots but not sensitive data.
    """
    result = await db.execute(
        select(Auction).options(selectinload(Auction.lots)).where(Auction.slug == slug)
    )
    auction = result.scalar_one_or_none()

    if not auction:
        logger.warning(f"Auction not found: {slug}")
        raise HTTPException(status_code=404, detail="Auction not found")

    logger.info(f"Public auction viewed: {slug}")
    return auction
