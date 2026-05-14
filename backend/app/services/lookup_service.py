"""通用字典表服务层 — LookupDict 业务逻辑 + 种子数据"""

from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lookup import LookupDict

# ─────────── 默认种子数据 ───────────

DEFAULT_LOOKUP_DATA = {
    "security_level": [
        {"code": "public", "name": "公开", "sort_order": 1},
        {"code": "internal", "name": "内部", "sort_order": 2},
        {"code": "secret", "name": "秘密", "sort_order": 3},
        {"code": "confidential", "name": "机密", "sort_order": 4},
    ],
    "retention_period": [
        {"code": "permanent", "name": "永久", "sort_order": 1},
        {"code": "long_term", "name": "长期", "sort_order": 2},
        {"code": "short_term", "name": "短期", "sort_order": 3},
        {"code": "30_years", "name": "30年", "sort_order": 4},
        {"code": "10_years", "name": "10年", "sort_order": 5},
    ],
}


async def seed_lookup_data(db: AsyncSession, category: str, user_id: UUID) -> None:
    """如果指定分类下没有任何数据，则插入默认种子数据"""
    count_stmt = select(func.count()).select_from(LookupDict).where(
        LookupDict.user_id == user_id,
        LookupDict.category == category,
    )
    result = await db.execute(count_stmt)
    count = result.scalar() or 0
    if count > 0:
        return

    default_items = DEFAULT_LOOKUP_DATA.get(category)
    if not default_items:
        return

    for item in default_items:
        db.add(LookupDict(
            user_id=user_id,
            category=category,
            code=item["code"],
            name=item["name"],
            sort_order=item.get("sort_order", 0),
            is_active=True,
        ))
    await db.flush()


def _lookup_dict_to_dict(item: LookupDict) -> dict:
    """LookupDict → dict"""
    return {
        "id": item.id,
        "category": item.category,
        "code": item.code,
        "name": item.name,
        "sort_order": item.sort_order,
        "is_active": item.is_active,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


# ─────────── CRUD ───────────

async def list_by_category(
    db: AsyncSession, category: str, user_id: UUID
) -> list[LookupDict]:
    """按分类获取条目列表"""
    stmt = (
        select(LookupDict)
        .where(
            LookupDict.user_id == user_id,
            LookupDict.category == category,
        )
        .order_by(LookupDict.sort_order.asc(), LookupDict.id.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def list_active_by_category(
    db: AsyncSession, category: str, user_id: UUID
) -> list[LookupDict]:
    """按分类获取仅启用的条目列表"""
    stmt = (
        select(LookupDict)
        .where(
            LookupDict.user_id == user_id,
            LookupDict.category == category,
            LookupDict.is_active == True,
        )
        .order_by(LookupDict.sort_order.asc(), LookupDict.id.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_id(
    db: AsyncSession, item_id: int, user_id: UUID
) -> Optional[LookupDict]:
    """获取单条字典条目"""
    stmt = select(LookupDict).where(
        LookupDict.id == item_id,
        LookupDict.user_id == user_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_item(
    db: AsyncSession, category: str, user_id: UUID, data: dict
) -> LookupDict:
    """在指定分类下创建字典条目"""
    item = LookupDict(
        user_id=user_id,
        category=category,
        code=data["code"],
        name=data["name"],
        sort_order=data.get("sort_order", 0),
        is_active=True,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def update_item(
    db: AsyncSession, item_id: int, user_id: UUID, data: dict
) -> Optional[LookupDict]:
    """更新字典条目"""
    item = await get_by_id(db, item_id, user_id)
    if not item:
        return None

    for field in ("code", "name", "sort_order", "is_active"):
        if field in data:
            setattr(item, field, data[field])

    await db.flush()
    await db.refresh(item)
    return item


async def delete_item(db: AsyncSession, item_id: int, user_id: UUID) -> bool:
    """删除字典条目"""
    item = await get_by_id(db, item_id, user_id)
    if not item:
        return False
    await db.delete(item)
    await db.flush()
    return True
