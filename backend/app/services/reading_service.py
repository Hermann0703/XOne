"""阅读模块服务层 — 书籍CRUD业务逻辑"""

from typing import Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reading import Book


async def list_books(
    db: AsyncSession,
    user_id: int,
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
) -> dict:
    """分页查询用户书籍列表，支持按状态、标签、关键词过滤。

    返回: {"items": [...], "total": int}
    """
    query = select(Book).where(Book.user_id == user_id)
    count_query = select(func.count(Book.id)).where(Book.user_id == user_id)

    if status:
        query = query.where(Book.status == status)
        count_query = count_query.where(Book.status == status)

    if tag:
        query = query.where(Book.tags.contains(tag))
        count_query = count_query.where(Book.tags.contains(tag))

    if search:
        search_filter = or_(
            Book.title.ilike(f"%{search}%"),
            Book.author.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页
    offset = (page - 1) * size
    query = query.order_by(Book.created_at.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def create_book(
    db: AsyncSession,
    user_id: int,
    data: dict,
) -> Book:
    """创建新书籍记录"""
    book = Book(user_id=user_id, **data)
    db.add(book)
    await db.flush()
    await db.refresh(book)
    return book


async def update_book(
    db: AsyncSession,
    book_id: int,
    user_id: int,
    data: dict,
) -> Optional[Book]:
    """更新书籍记录，仅允许更新自己的书籍"""
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == user_id)
    )
    book = result.scalar_one_or_none()
    if not book:
        return None

    for key, value in data.items():
        if hasattr(book, key) and value is not None:
            setattr(book, key, value)

    await db.flush()
    await db.refresh(book)
    return book


async def delete_book(
    db: AsyncSession,
    book_id: int,
    user_id: int,
) -> bool:
    """删除书籍记录，仅允许删除自己的书籍"""
    result = await db.execute(
        select(Book).where(Book.id == book_id, Book.user_id == user_id)
    )
    book = result.scalar_one_or_none()
    if not book:
        return False

    await db.delete(book)
    await db.flush()
    return True
