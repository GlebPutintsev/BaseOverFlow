from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    """Базовый класс для всех моделей."""
    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """Зависимость для получения асинхронной сессии базы данных."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables and run lightweight migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Lightweight column migrations for SQLite
    # (create_all won't add new columns to existing tables)
    _migrations = [
        ("incidents", "image_url", "VARCHAR(500)"),
        ("incidents", "image_position", "VARCHAR(20) DEFAULT '50 50'"),
        ("guides", "image_url", "VARCHAR(500)"),
        ("guides", "image_position", "VARCHAR(20) DEFAULT '50 50'"),
    ]
    async with engine.begin() as conn:
        for table, column, col_type in _migrations:
            try:
                await conn.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
                )
                print(f"  ✅ Added column {table}.{column}")
            except Exception:
                # Column already exists — that's fine
                pass
