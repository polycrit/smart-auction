from typing import Optional
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_session
from app.config import settings


async def require_admin(x_admin_token: Optional[str] = Header(default=None)) -> None:
    if not settings.admin_token:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN not configured")
    if x_admin_token != settings.admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token"
        )


get_db = get_session  # alias for brevity
