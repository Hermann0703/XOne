"""物理存储管理模块服务层 — 档案柜/档案盒 CRUD + 盒内档案查询"""

from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.storage import Cabinet, Box
from app.models.archive import Archive


# ═══════════════════════════════════════════════════════════════════
# 档案柜 CRUD
# ═══════════════════════════════════════════════════════════════════

async def list_cabinets(
    db: AsyncSession,
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    location: Optional[str] = None,
) -> dict:
    """分页查询档案柜列表。"""
    query = select(Cabinet)
    count_query = select(func.count(Cabinet.id))

    if search:
        search_filter = Cabinet.name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if location:
        query = query.where(Cabinet.location.ilike(f"%{location}%"))
        count_query = count_query.where(Cabinet.location.ilike(f"%{location}%"))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(Cabinet.created_at.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def get_cabinet(db: AsyncSession, cabinet_id: int) -> Optional[Cabinet]:
    """获取单个档案柜详情。"""
    result = await db.execute(select(Cabinet).where(Cabinet.id == cabinet_id))
    return result.scalar_one_or_none()


async def create_cabinet(db: AsyncSession, data: dict) -> Cabinet:
    """创建档案柜。"""
    cabinet = Cabinet(**data)
    db.add(cabinet)
    await db.flush()
    await db.refresh(cabinet)
    return cabinet


async def update_cabinet(db: AsyncSession, cabinet_id: int, data: dict) -> Optional[Cabinet]:
    """更新档案柜信息。"""
    result = await db.execute(select(Cabinet).where(Cabinet.id == cabinet_id))
    cabinet = result.scalar_one_or_none()
    if not cabinet:
        return None

    for key, value in data.items():
        if hasattr(cabinet, key) and value is not None:
            setattr(cabinet, key, value)

    await db.flush()
    await db.refresh(cabinet)
    return cabinet


async def delete_cabinet(db: AsyncSession, cabinet_id: int) -> bool:
    """删除档案柜（级联删除所有档案盒）。"""
    result = await db.execute(select(Cabinet).where(Cabinet.id == cabinet_id))
    cabinet = result.scalar_one_or_none()
    if not cabinet:
        return False

    await db.delete(cabinet)
    await db.flush()
    return True


# ═══════════════════════════════════════════════════════════════════
# 档案盒 CRUD
# ═══════════════════════════════════════════════════════════════════

async def list_boxes(
    db: AsyncSession,
    page: int = 1,
    size: int = 20,
    cabinet_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
) -> dict:
    """分页查询档案盒列表。"""
    query = select(Box)
    count_query = select(func.count(Box.id))

    if cabinet_id is not None:
        query = query.where(Box.cabinet_id == cabinet_id)
        count_query = count_query.where(Box.cabinet_id == cabinet_id)

    if status:
        query = query.where(Box.status == status)
        count_query = count_query.where(Box.status == status)

    if search:
        query = query.where(Box.box_no.ilike(f"%{search}%"))
        count_query = count_query.where(Box.box_no.ilike(f"%{search}%"))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(Box.created_at.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def get_box(db: AsyncSession, box_id: int) -> Optional[Box]:
    """获取单个档案盒详情。"""
    result = await db.execute(select(Box).where(Box.id == box_id))
    return result.scalar_one_or_none()


async def create_box(db: AsyncSession, data: dict) -> Optional[Box]:
    """创建档案盒。先验证所属档案柜是否存在。"""
    cabinet_result = await db.execute(
        select(Cabinet).where(Cabinet.id == data["cabinet_id"])
    )
    if not cabinet_result.scalar_one_or_none():
        return None

    box = Box(**data)
    db.add(box)
    await db.flush()
    await db.refresh(box)
    return box


async def update_box(db: AsyncSession, box_id: int, data: dict) -> Optional[Box]:
    """更新档案盒信息。"""
    result = await db.execute(select(Box).where(Box.id == box_id))
    box = result.scalar_one_or_none()
    if not box:
        return None

    for key, value in data.items():
        if hasattr(box, key) and value is not None:
            setattr(box, key, value)

    await db.flush()
    await db.refresh(box)
    return box


async def delete_box(db: AsyncSession, box_id: int) -> bool:
    """删除档案盒。"""
    result = await db.execute(select(Box).where(Box.id == box_id))
    box = result.scalar_one_or_none()
    if not box:
        return False

    await db.delete(box)
    await db.flush()
    return True


# ═══════════════════════════════════════════════════════════════════
# 关联查询
# ═══════════════════════════════════════════════════════════════════

async def get_cabinet_boxes(db: AsyncSession, cabinet_id: int) -> list:
    """获取某个档案柜内的所有档案盒。"""
    result = await db.execute(
        select(Box)
        .where(Box.cabinet_id == cabinet_id)
        .order_by(Box.box_no)
    )
    return result.scalars().all()


async def get_box_archives(db: AsyncSession, box_id: int) -> list:
    """获取某个档案盒内的所有档案。"""
    result = await db.execute(
        select(Archive)
        .where(Archive.box_id == box_id)
        .order_by(Archive.archive_no)
    )
    return result.scalars().all()
