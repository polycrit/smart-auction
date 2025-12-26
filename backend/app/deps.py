from typing import Optional
from uuid import UUID
from fastapi import Header, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_session
from app.config import settings
from app.models import AdminUser

# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_session),
) -> Optional[AdminUser]:
    """
    Get the current authenticated admin user from JWT token.
    Returns None if no valid token is provided.
    """
    if not credentials:
        return None

    from app.services.auth import decode_token, get_user_by_id

    payload = decode_token(credentials.credentials)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    try:
        user = await get_user_by_id(db, UUID(user_id))
        if user and user.is_active:
            return user
    except ValueError:
        pass

    return None


async def require_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_admin_token: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_session),
) -> AdminUser:
    """
    Require admin authentication via JWT token or legacy admin token.
    Supports both methods for backward compatibility.
    """
    # Try JWT authentication first
    if credentials:
        from app.services.auth import decode_token, get_user_by_id

        payload = decode_token(credentials.credentials)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                try:
                    user = await get_user_by_id(db, UUID(user_id))
                    if user and user.is_active:
                        return user
                except ValueError:
                    pass

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fall back to legacy admin token (for backward compatibility)
    if x_admin_token:
        if settings.admin_token and x_admin_token == settings.admin_token:
            # Return a dummy user for legacy auth
            return AdminUser(
                id=UUID("00000000-0000-0000-0000-000000000000"),
                username="legacy_admin",
                password_hash="",
                is_active=True,
                is_superuser=True,
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


get_db = get_session  # alias for brevity
