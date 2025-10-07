import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set (see .env)")

# The fix is adding the connect_args parameter here
engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=5,
    connect_args={
        "ssl": "require"  # Or "prefer", "allow", etc., depending on your needs.
    },
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
