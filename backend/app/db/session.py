from collections.abc import AsyncIterator

from sqlalchemy import event
from sqlalchemy.engine.interfaces import DBAPIConnection
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import ConnectionPoolEntry

from app.core.config import get_settings

settings = get_settings()


def enable_sqlite_foreign_keys(async_engine: AsyncEngine) -> None:
    """SQLite ignores FK constraints per-connection unless this pragma is set.

    Needed now that dims/fact/bridges rely on ondelete=CASCADE to keep the
    star schema consistent (e.g. deleting a movie should cascade into its
    fact/context/review rows).
    """

    @event.listens_for(async_engine.sync_engine, "connect")
    def _set_sqlite_pragma(
        dbapi_connection: DBAPIConnection, connection_record: ConnectionPoolEntry
    ) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


engine = create_async_engine(settings.database_url, echo=settings.environment == "local")
enable_sqlite_foreign_keys(engine)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
