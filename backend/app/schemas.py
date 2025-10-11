from __future__ import annotations
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
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
