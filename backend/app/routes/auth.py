"""
Authentication routes for admin login.
"""
import logging
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.services.auth import authenticate_user, create_access_token

logger = logging.getLogger("auction.routes.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_session),
):
    """Authenticate admin user and return JWT token."""
    user = await authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id, user.username)
    logger.info(f"Login successful: {user.username}")

    return LoginResponse(
        access_token=token,
        username=user.username,
    )


@router.post("/logout")
async def logout():
    """
    Logout endpoint (for client-side token invalidation).
    Note: JWT tokens cannot be invalidated server-side without a blacklist.
    The client should delete the token on logout.
    """
    return {"message": "Logged out successfully"}
