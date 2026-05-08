"""观影模块服务层 — 影视CRUD业务逻辑"""

from typing import Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.media import Movie


async def list_movies(
    db: AsyncSession,
    user_id: int,
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


async def create_movie(
    db: AsyncSession,
    user_id: int,
    data: dict,
) -> Movie:
    """创建新影视记录"""
    movie = Movie(user_id=user_id, **data)
    db.add(movie)
    await db.flush()
    await db.refresh(movie)
    return movie


async def update_movie(
    db: AsyncSession,
    movie_id: int,
    user_id: int,
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
            setattr(movie, key, value)

    await db.flush()
    await db.refresh(movie)
    return movie


async def delete_movie(
    db: AsyncSession,
    movie_id: int,
    user_id: int,
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
