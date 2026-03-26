import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import AdminUser

logger = logging.getLogger("auction.auth")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(user_id: UUID, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        return None

async def get_user_by_username(db: AsyncSession, username: str) -> Optional[AdminUser]:
    result = await db.execute(
        select(AdminUser).where(AdminUser.username == username)
    )
    return result.scalar_one_or_none()

async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[AdminUser]:
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == user_id)
    )
    return result.scalar_one_or_none()

async def authenticate_user(
    db: AsyncSession, username: str, password: str
) -> Optional[AdminUser]:
    user = await get_user_by_username(db, username)
    if not user:
        logger.warning(f"Login attempt for non-existent user: {username}")
        return None
    if not user.is_active:
        logger.warning(f"Login attempt for inactive user: {username}")
        return None
    if not verify_password(password, user.password_hash):
        logger.warning(f"Invalid password for user: {username}")
        return None

    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    logger.info(f"User authenticated: {username}")
    return user

async def create_admin_user(
    db: AsyncSession,
    username: str,
    password: str,
    is_superuser: bool = False,
) -> AdminUser:
    user = AdminUser(
        username=username,
        password_hash=hash_password(password),
        is_superuser=is_superuser,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info(f"Admin user created: {username} (superuser={is_superuser})")
    return user

async def ensure_master_admin(db: AsyncSession) -> None:
    existing = await get_user_by_username(db, settings.master_admin_username)
    if existing:
        logger.info(f"Master admin already exists: {settings.master_admin_username}")
        return

    await create_admin_user(
        db,
        username=settings.master_admin_username,
        password=settings.master_admin_password,
        is_superuser=True,
    )
    logger.info(f"Master admin created: {settings.master_admin_username}")
