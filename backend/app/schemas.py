from __future__ import annotations
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field
from app.enums import AuctionStatus, Currency


# ---- Create payloads ----
class AuctionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class LotCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    base_price: Decimal = Field(default=0, ge=0)
    min_increment: Decimal = Field(default=1, gt=0)
    currency: Currency = Currency.EUR
    image_url: Optional[str] = None


class ParticipantCreate(BaseModel):
    vendor_id: UUID


class VendorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=1, max_length=255)
    comment: Optional[str] = None


class AuctionStatusUpdate(BaseModel):
    status: AuctionStatus


class BidPlace(BaseModel):
    lot_id: UUID
    amount: Decimal


# ---- Reads ----
class VendorRead(BaseModel):
    id: UUID
    name: str
    email: str
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ParticipantRead(BaseModel):
    id: UUID
    vendor: VendorRead

    class Config:
        from_attributes = True


class LotRead(BaseModel):
    id: UUID
    lot_number: int
    name: str
    base_price: Decimal
    min_increment: Decimal
    currency: str
    current_price: Decimal
    current_leader: Optional[UUID] = None
    end_time: Optional[datetime] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class AuctionRead(BaseModel):
    id: UUID
    slug: str
    title: str
    description: Optional[str]
    status: AuctionStatus
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    created_at: datetime
    lots: List[LotRead] = []

    class Config:
        from_attributes = True


# ---- Analytics Schemas ----
class AuctionAnalytics(BaseModel):
    total_auctions: int
    active_auctions: int
    recent_auctions: int
    scheduled_auctions: int
    by_status: dict


class BidActivityData(BaseModel):
    date: Optional[str]
    count: int


class BidAnalytics(BaseModel):
    total_bids: int
    recent_bids_24h: int
    avg_bids_per_lot: float
    unique_bidders: int
    daily_activity: List[BidActivityData]


class RevenueAnalytics(BaseModel):
    realized_revenue: float
    current_lot_value: float
    avg_lot_price: float
    total_lots: int
    ended_lots: int
    lots_with_bids: int
    conversion_rate: float
    avg_winning_premium: float
    by_currency: dict


class TopVendor(BaseModel):
    id: str
    name: str
    email: str
    auction_count: int
    bid_count: int


class VendorAnalytics(BaseModel):
    total_vendors: int
    participating_vendors: int
    bidding_vendors: int
    total_participations: int
    blocked_participations: int
    leading_vendors: int
    top_vendors: List[TopVendor]


class ParticipantAnalytics(BaseModel):
    total_participants: int
    active_participants: int
    blocked_participants: int
    participants_with_bids: int
    current_leaders: int
    engagement_rate: float


class DashboardSummary(BaseModel):
    auctions: AuctionAnalytics
    bids: BidAnalytics
    revenue: RevenueAnalytics
    vendors: VendorAnalytics
    generated_at: str
