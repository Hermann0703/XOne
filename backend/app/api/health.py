"""系统健康检查 — 检查 PostgreSQL / Redis / MongoDB / Qdrant / Meilisearch"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter

from app.core.config import settings
from app.core.database import engine

logger = logging.getLogger(__name__)

router = APIRouter(tags=["系统"])


async def _check_postgresql() -> dict:
    """检查 PostgreSQL 连接"""
    if not settings.DATABASE_URL:
        return {"status": "not_configured"}

    try:
        start = time.monotonic()
        async with engine.connect() as conn:
            await conn.execute(  # type: ignore[union-attr]
                __import__("sqlalchemy").text("SELECT 1")
            )
        latency = (time.monotonic() - start) * 1000
        return {"status": "ok", "latency_ms": round(latency, 1)}
    except Exception as e:
        logger.warning("PostgreSQL 健康检查失败: %s", e)
        return {"status": "down", "error": str(e)}


async def _check_redis() -> dict:
    """检查 Redis 连接"""
    if not settings.REDIS_URL:
        return {"status": "not_configured"}

    try:
        import redis.asyncio as aioredis

        start = time.monotonic()
        r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        await r.ping()
        await r.aclose()
        latency = (time.monotonic() - start) * 1000
        return {"status": "ok", "latency_ms": round(latency, 1)}
    except Exception as e:
        logger.warning("Redis 健康检查失败: %s", e)
        return {"status": "down", "error": str(e)}


async def _check_mongodb() -> dict:
    """检查 MongoDB 连接"""
    if not settings.MONGODB_URL:
        return {"status": "not_configured"}

    try:
        from app.core.mongodb import mongodb_client

        if mongodb_client is None:
            return {"status": "down", "error": "MongoDB 客户端未初始化"}

        start = time.monotonic()
        await mongodb_client.admin.command("ping")
        latency = (time.monotonic() - start) * 1000
        return {"status": "ok", "latency_ms": round(latency, 1)}
    except Exception as e:
        logger.warning("MongoDB 健康检查失败: %s", e)
        return {"status": "down", "error": str(e)}


async def _check_qdrant() -> dict:
    """检查 Qdrant 向量数据库"""
    if not settings.QDRANT_URL:
        return {"status": "not_configured"}

    try:
        start = time.monotonic()
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.QDRANT_URL}/health")
            resp.raise_for_status()
        latency = (time.monotonic() - start) * 1000
        return {"status": "ok", "latency_ms": round(latency, 1)}
    except Exception as e:
        logger.warning("Qdrant 健康检查失败: %s", e)
        return {"status": "down", "error": str(e)}


async def _check_meilisearch() -> dict:
    """检查 Meilisearch 搜索引擎"""
    if not settings.MEILISEARCH_URL:
        return {"status": "not_configured"}

    try:
        start = time.monotonic()
        headers = {}
        if settings.MEILISEARCH_KEY:
            headers["Authorization"] = f"Bearer {settings.MEILISEARCH_KEY}"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{settings.MEILISEARCH_URL}/health", headers=headers
            )
            resp.raise_for_status()
        latency = (time.monotonic() - start) * 1000
        return {"status": "ok", "latency_ms": round(latency, 1)}
    except Exception as e:
        logger.warning("Meilisearch 健康检查失败: %s", e)
        return {"status": "down", "error": str(e)}


def _compute_overall(checks: dict) -> str:
    """根据所有检查结果计算整体状态"""
    statuses = [v["status"] for v in checks.values()]
    if any(s == "down" for s in statuses):
        return "down"
    if any(s == "degraded" for s in statuses):
        return "degraded"
    return "ok"


@router.get("/health")
async def system_health():
    """增强系统健康检查 — 检查所有已配置的后端服务"""
    # 并行执行所有健康检查
    results = await asyncio.gather(
        _check_postgresql(),
        _check_redis(),
        _check_mongodb(),
        _check_qdrant(),
        _check_meilisearch(),
        return_exceptions=True,
    )

    # 处理可能的异常
    checks = {
        "database": results[0] if not isinstance(results[0], BaseException) else {"status": "down", "error": str(results[0])},
        "redis": results[1] if not isinstance(results[1], BaseException) else {"status": "down", "error": str(results[1])},
        "mongodb": results[2] if not isinstance(results[2], BaseException) else {"status": "down", "error": str(results[2])},
        "qdrant": results[3] if not isinstance(results[3], BaseException) else {"status": "down", "error": str(results[3])},
        "meilisearch": results[4] if not isinstance(results[4], BaseException) else {"status": "down", "error": str(results[4])},
    }

    overall = _compute_overall(checks)

    return {
        "status": overall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
    }
