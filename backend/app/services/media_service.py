"""观影模块服务层 — 影视CRUD业务逻辑"""

from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.media import Movie


async def list_movies(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
    genre: Optional[str] = None,
    search: Optional[str] = None,
) -> dict:
    """分页查询用户影视列表，支持按状态、类型、关键词过滤。

    返回: {"items": [...], "total": int}
    """
    query = select(Movie).where(Movie.user_id == user_id)
    count_query = select(func.count(Movie.id)).where(Movie.user_id == user_id)

    if status:
        query = query.where(Movie.status == status)
        count_query = count_query.where(Movie.status == status)

    if genre:
        query = query.where(Movie.genre.contains(genre))
        count_query = count_query.where(Movie.genre.contains(genre))

    if search:
        search_filter = or_(
            Movie.title.ilike(f"%{search}%"),
            Movie.title_en.ilike(f"%{search}%"),
            Movie.director.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页
    offset = (page - 1) * size
    query = query.order_by(Movie.created_at.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}


_WATCH_DATE_FIELDS = ("watch_date",)


def _to_date(value):
    """将日期字符串转为 date 对象"""
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value)
    return value


def _convert_dates(data: dict) -> dict:
    """将字符串日期字段转为 Python date 对象"""
    data = dict(data)
    for field in _WATCH_DATE_FIELDS:
        if field in data and data[field] is not None:
            data[field] = _to_date(data[field])
    return data


async def create_movie(
    db: AsyncSession,
    user_id: UUID,
    data: dict,
) -> Movie:
    """创建新影视记录"""
    data = _convert_dates(data)
    movie = Movie(user_id=user_id, **data)
    db.add(movie)
    await db.flush()
    await db.refresh(movie)
    return movie


async def update_movie(
    db: AsyncSession,
    movie_id: int,
    user_id: UUID,
    data: dict,
) -> Optional[Movie]:
    """更新影视记录，仅允许更新自己的影视"""
    result = await db.execute(
        select(Movie).where(Movie.id == movie_id, Movie.user_id == user_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        return None

    for key, value in data.items():
        if hasattr(movie, key) and value is not None:
            if key in _WATCH_DATE_FIELDS:
                value = _to_date(value)
            setattr(movie, key, value)

    await db.flush()
    await db.refresh(movie)
    return movie


async def delete_movie(
    db: AsyncSession,
    movie_id: int,
    user_id: UUID,
) -> bool:
    """删除影视记录，仅允许删除自己的影视"""
    result = await db.execute(
        select(Movie).where(Movie.id == movie_id, Movie.user_id == user_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        return False

    await db.delete(movie)
    await db.flush()
    return True
