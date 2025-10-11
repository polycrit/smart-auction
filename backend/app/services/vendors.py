from __future__ import annotations
from uuid import uuid4, UUID
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Vendor


async def create_vendor(
    db: AsyncSession, name: str, email: str, comment: Optional[str] = None
) -> Vendor:
    """Create a new vendor."""
    vendor = Vendor(
        id=uuid4(),
        name=name,
        email=email,
        comment=comment,
    )
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor


async def get_vendor_by_id(db: AsyncSession, vendor_id: UUID) -> Optional[Vendor]:
    """Get a vendor by ID."""
    return await db.scalar(select(Vendor).where(Vendor.id == vendor_id))


async def list_vendors(
    db: AsyncSession, skip: int = 0, limit: int = 100
) -> List[Vendor]:
    """List all vendors with pagination."""
    result = await db.execute(
        select(Vendor).order_by(Vendor.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def update_vendor(
    db: AsyncSession,
    vendor_id: UUID,
    name: Optional[str] = None,
    email: Optional[str] = None,
    comment: Optional[str] = None,
) -> Optional[Vendor]:
    """Update a vendor."""
    vendor = await get_vendor_by_id(db, vendor_id)
    if not vendor:
        return None

    if name is not None:
        vendor.name = name
    if email is not None:
        vendor.email = email
    if comment is not None:
        vendor.comment = comment

    await db.commit()
    await db.refresh(vendor)
    return vendor


async def delete_vendor(db: AsyncSession, vendor_id: UUID) -> bool:
    """Delete a vendor."""
    vendor = await get_vendor_by_id(db, vendor_id)
    if not vendor:
        return False

    await db.delete(vendor)
    await db.commit()
    return True
