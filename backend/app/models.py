from __future__ import annotations
from typing import List, Optional
from uuid import uuid4, UUID as UUID_T
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Numeric,
    ForeignKey,
    func,
    Integer,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID


class Base(DeclarativeBase):
    pass


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[UUID_T] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    comment: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    participants: Mapped[List["Participant"]] = relationship(back_populates="vendor")


class Auction(Base):
    __tablename__ = "auctions"

    id: Mapped[UUID_T] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        Text, default="draft", nullable=False
    )  # draft|live|paused|ended
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[Optional[UUID_T]] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    lots: Mapped[List["Lot"]] = relationship(
        back_populates="auction", cascade="all, delete-orphan"
    )
    participants: Mapped[List["Participant"]] = relationship(
        back_populates="auction", cascade="all, delete-orphan"
    )


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[UUID_T] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    auction_id: Mapped[UUID_T] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auctions.id", ondelete="CASCADE"),
        nullable=False,
    )
    vendor_id: Mapped[UUID_T] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False,
    )
    invite_token: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    auction: Mapped["Auction"] = relationship(back_populates="participants")
    vendor: Mapped["Vendor"] = relationship(back_populates="participants")


class Lot(Base):
    __tablename__ = "lots"

    id: Mapped[UUID_T] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    auction_id: Mapped[UUID_T] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auctions.id", ondelete="CASCADE"),
        nullable=False,
    )
    lot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)

    base_price: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    min_increment: Mapped[float] = mapped_column(
        Numeric(12, 2), default=1, nullable=False
    )
    currency: Mapped[str] = mapped_column(String(8), default="EUR", nullable=False)

    current_price: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    # FIX: Add ondelete="SET NULL" to allow participant deletion
    current_leader: Mapped[Optional[UUID_T]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("participants.id", ondelete="SET NULL")
    )
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    extension_sec: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    auction: Mapped["Auction"] = relationship(back_populates="lots")
    bids: Mapped[List["Bid"]] = relationship(
        back_populates="lot", cascade="all, delete-orphan"
    )


class Bid(Base):
    __tablename__ = "bids"

    id: Mapped[UUID_T] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    lot_id: Mapped[UUID_T] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lots.id", ondelete="CASCADE"), nullable=False
    )
    participant_id: Mapped[UUID_T] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participants.id", ondelete="CASCADE"),
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    placed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    lot: Mapped["Lot"] = relationship(back_populates="bids")
