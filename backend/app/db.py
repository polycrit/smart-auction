from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

# Create async engine with SSL support for PostgreSQL
engine = create_async_engine(
    settings.database_url,
    pool_size=5,
    max_overflow=5,
    connect_args={
        "ssl": "require"  # Or "prefer", "allow", etc., depending on your needs.
    },
    echo=settings.debug,
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
