from __future__ import annotations
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


# ---- Create payloads ----
class AuctionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class LotCreate(BaseModel):
    lot_number: int = 1
    name: str
    base_price: Decimal = Field(default=0)
    min_increment: Decimal = Field(default=1)
    currency: str = "EUR"


class ParticipantCreate(BaseModel):
    display_name: str


class AuctionStatusUpdate(BaseModel):
    status: str  # draft|live|paused|ended


class BidPlace(BaseModel):
    lot_id: UUID
    amount: Decimal


# ---- Reads ----
class ParticipantRead(BaseModel):
    id: UUID
    display_name: str

    class Config:
        from_attributes = True


class LotRead(BaseModel):
    id: UUID
    lot_number: int
    name: str
    base_price: Decimal
    min_increment: Decimal
    currency: str
    status: str
    current_price: Decimal
    current_leader: Optional[UUID] = None
    end_time: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuctionRead(BaseModel):
    id: UUID
    slug: str
    title: str
    description: Optional[str]
    status: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    created_at: datetime
    lots: List[LotRead] = []

    class Config:
        from_attributes = True
