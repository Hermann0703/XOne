from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

mongodb_client: AsyncIOMotorClient | None = None
_mongo_db: AsyncIOMotorDatabase | None = None


async def connect_mongo():
    global mongodb_client, _mongo_db
    mongodb_client = AsyncIOMotorClient(settings.MONGODB_URL)
    _mongo_db = mongodb_client[settings.MONGODB_DB]


async def close_mongo():
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()
        mongodb_client = None


def get_mongo_db() -> AsyncIOMotorDatabase:
    if _mongo_db is None:
        raise RuntimeError("MongoDB 未连接，请先调用 connect_mongo()")
    return _mongo_db
