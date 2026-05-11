"""个人仪表盘聚合 API"""

import asyncio
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.shopping import ShoppingItem
from app.models.reading import Book
from app.models.media import Movie
from app.services import health_service, asset_service

router = APIRouter()


# ──────────────────────────────────────────────
#  聚合辅助函数（直接查询，容错返回 0/null）
# ──────────────────────────────────────────────

async def _get_shopping_stats(db: AsyncSession, user_id: UUID) -> dict:
    """购物统计：待购数量 + 总数"""
    try:
        total_q = select(func.count(ShoppingItem.id)).where(
            ShoppingItem.user_id == user_id
        )
        pending_q = select(func.count(ShoppingItem.id)).where(
            ShoppingItem.user_id == user_id,
            ShoppingItem.status == "pending",
        )
        total = (await db.execute(total_q)).scalar() or 0
        pending = (await db.execute(pending_q)).scalar() or 0
        return {"shopping_pending": pending, "shopping_total": total}
    except Exception:
        return {"shopping_pending": 0, "shopping_total": 0}


async def _get_reading_stats(db: AsyncSession, user_id: UUID) -> dict:
    """阅读统计：总数 + 在读 + 已读"""
    try:
        total_q = select(func.count(Book.id)).where(Book.user_id == user_id)
        reading_q = select(func.count(Book.id)).where(
            Book.user_id == user_id, Book.status == "reading"
        )
        completed_q = select(func.count(Book.id)).where(
            Book.user_id == user_id, Book.status == "completed"
        )
        total = (await db.execute(total_q)).scalar() or 0
        in_progress = (await db.execute(reading_q)).scalar() or 0
        completed = (await db.execute(completed_q)).scalar() or 0
        return {
            "reading_total": total,
            "reading_in_progress": in_progress,
            "reading_completed": completed,
        }
    except Exception:
        return {"reading_total": 0, "reading_in_progress": 0, "reading_completed": 0}


async def _get_media_stats(db: AsyncSession, user_id: UUID) -> dict:
    """影视统计：总数 + 已看"""
    try:
        total_q = select(func.count(Movie.id)).where(Movie.user_id == user_id)
        watched_q = select(func.count(Movie.id)).where(
            Movie.user_id == user_id, Movie.status == "watched"
        )
        total = (await db.execute(total_q)).scalar() or 0
        watched = (await db.execute(watched_q)).scalar() or 0
        return {"media_total": total, "media_watched": watched}
    except Exception:
        return {"media_total": 0, "media_watched": 0}


async def _get_health_stats(db: AsyncSession, user_id: UUID) -> dict:
    """健康统计：调用 health_service.get_dashboard 提取关键字段"""
    try:
        data = await health_service.get_dashboard(db, user_id)
        return {
            "health_today_calories": data.get("today_calories_in", 0),
            "health_exercise_minutes": data.get("today_exercise_minutes", 0),
            "weight_trend": data.get("weight_trend", []),
        }
    except Exception:
        return {"health_today_calories": 0, "health_exercise_minutes": 0, "weight_trend": []}


async def _get_assets_stats(db: AsyncSession, user_id: UUID) -> dict:
    """资产统计：调用 asset_service.get_dashboard 提取关键字段"""
    try:
        data = await asset_service.get_dashboard(db, user_id)
        return {
            "assets_net_worth": data.get("net_worth", 0),
            "assets_month_income": data.get("total_income", 0),
            "assets_month_expense": data.get("total_expense", 0),
        }
    except Exception:
        return {"assets_net_worth": 0, "assets_month_income": 0, "assets_month_expense": 0}


async def _get_recent_reading(db: AsyncSession, user_id: UUID) -> list[dict]:
    """最近 3 本书籍（含阅读进度）"""
    try:
        q = (
            select(Book)
            .where(Book.user_id == user_id)
            .order_by(desc(Book.updated_at))
            .limit(3)
        )
        rows = (await db.execute(q)).scalars().all()
        result = []
        for b in rows:
            if b.total_pages and b.total_pages > 0:
                progress = round((b.current_page or 0) / b.total_pages, 2)
            else:
                progress = 0.0
            result.append({
                "id": str(b.id),
                "title": b.title,
                "progress": progress,
                "last_read": str(b.updated_at.date()) if b.updated_at else None,
            })
        return result
    except Exception:
        return []


async def _get_recent_activities(db: AsyncSession, user_id: UUID) -> list[dict]:
    """最近 10 条活动动态（聚合 shopping / reading / media）"""
    activities: list[dict] = []

    try:
        # ── 购物活动 ──
        shop_q = (
            select(ShoppingItem)
            .where(ShoppingItem.user_id == user_id)
            .order_by(desc(ShoppingItem.updated_at))
            .limit(10)
        )
        shop_rows = (await db.execute(shop_q)).scalars().all()
        for item in shop_rows:
            action = "购入商品" if item.status == "purchased" else "添加商品"
            activities.append({
                "id": str(item.id),
                "action": action,
                "target": item.name,
                "time": (
                    item.updated_at.isoformat()
                    if isinstance(item.updated_at, datetime)
                    else str(item.updated_at)
                ),
                "module": "shopping",
            })
    except Exception:
        pass

    try:
        # ── 阅读活动 ──
        read_q = (
            select(Book)
            .where(Book.user_id == user_id)
            .order_by(desc(Book.updated_at))
            .limit(10)
        )
        read_rows = (await db.execute(read_q)).scalars().all()
        for book in read_rows:
            if book.status == "completed":
                action = "完成阅读"
            elif book.status == "reading":
                action = "开始阅读"
            else:
                action = "添加书籍"
            activities.append({
                "id": str(book.id),
                "action": action,
                "target": book.title,
                "time": (
                    book.updated_at.isoformat()
                    if isinstance(book.updated_at, datetime)
                    else str(book.updated_at)
                ),
                "module": "reading",
            })
    except Exception:
        pass

    try:
        # ── 影视活动 ──
        media_q = (
            select(Movie)
            .where(Movie.user_id == user_id)
            .order_by(desc(Movie.updated_at))
            .limit(10)
        )
        media_rows = (await db.execute(media_q)).scalars().all()
        for movie in media_rows:
            if movie.status == "watched":
                action = "看完影片"
            elif movie.status == "watching":
                action = "在看在追"
            else:
                action = "添加影片"
            activities.append({
                "id": str(movie.id),
                "action": action,
                "target": movie.title,
                "time": (
                    movie.updated_at.isoformat()
                    if isinstance(movie.updated_at, datetime)
                    else str(movie.updated_at)
                ),
                "module": "media",
            })
    except Exception:
        pass

    # 按时间降序、取前 10
    activities.sort(key=lambda x: x["time"], reverse=True)
    return activities[:10]


# ──────────────────────────────────────────────
#  仪表盘聚合端点
# ──────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """个人仪表盘聚合数据 — 并行查询购物/阅读/影视/健康/资产统计"""
    user_id = current_user.id

    # 并行执行所有查询，各自容错
    results = await asyncio.gather(
        _get_shopping_stats(db, user_id),
        _get_reading_stats(db, user_id),
        _get_media_stats(db, user_id),
        _get_health_stats(db, user_id),
        _get_assets_stats(db, user_id),
        _get_recent_reading(db, user_id),
        _get_recent_activities(db, user_id),
    )

    shopping_stats, reading_stats, media_stats, health_stats, assets_stats, recent_reading, recent_activities = results

    # 合并 stats 字典
    stats = {}
    stats.update(shopping_stats)
    stats.update(reading_stats)
    stats.update(media_stats)
    stats.update(health_stats)
    stats.update(assets_stats)

    return {
        "code": 0,
        "message": "查询成功",
        "data": {
            "stats": stats,
            "recent_reading": recent_reading,
            "recent_activities": recent_activities,
        },
    }
