"""XOne API — 个人/工作一体化管理平台"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import engine, Base
from app.core.mongodb import connect_mongo, close_mongo

logger = logging.getLogger(__name__)

# 全局数据库健康状态标志
_db_healthy = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时连接数据库，关闭时断开。"""
    global _db_healthy

    # 启动
    logger.info("  [XOne] %s v%s 启动中 (mode=%s)", settings.APP_NAME, settings.VERSION, settings.MODE)

    # PostgreSQL
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("  [XOne] PostgreSQL 已连接")
    except Exception as e:
        logger.error("  [XOne] PostgreSQL 连接失败: %s", e)

    # MongoDB
    try:
        await connect_mongo()
        _db_healthy = True
        logger.info("  [XOne] MongoDB 已连接")
    except Exception as e:
        logger.error("  [XOne] MongoDB 连接失败: %s", e)

    logger.info("  [XOne] 启动完成 ✓")
    yield

    # 关闭
    await engine.dispose()
    await close_mongo()
    _db_healthy = False
    logger.info("  [XOne] 已关闭所有数据库连接")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — 开发环境允许所有来源（allow_credentials=False 因 allow_origins=["*"]）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 路由
from app.api.auth import router as auth_router

app.include_router(auth_router, prefix="/api/v1")
app.include_router(api_router)


@app.get("/health", tags=["系统"])
async def health_check():
    """健康检查端点"""
    return {"status": "ok" if _db_healthy else "degraded", "database": _db_healthy}
