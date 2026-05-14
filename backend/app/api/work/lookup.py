"""通用字典管理 API — LookupDict CRUD"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.lookup import LookupDict

router = APIRouter(prefix="/lookup", tags=["工作-字典"], redirect_slashes=False)


# ── Schemas ──────────────────────────────────────────────────

def _lookup_to_dict(item: LookupDict) -> dict:
    return {
        "id": item.id,
        "category": item.category,
        "code": item.code,
        "name": item.name,
        "sort_order": item.sort_order,
        "is_active": item.is_active,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


class LookupDictCreate(BaseModel):
    category: str = Field(..., max_length=32)
    code: str = Field(..., max_length=64)
    name: str = Field(..., max_length=64)
    sort_order: int = 0
    is_active: bool = True


class LookupDictUpdate(BaseModel):
    category: Optional[str] = None
    code: Optional[str] = None
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


# ── 种子数据 ─────────────────────────────────────────────────

async def _seed_default_lookup_dicts(db: AsyncSession, user_id: UUID) -> None:
    """首次访问时自动插入默认字典项"""
    result = await db.execute(
        select(func.count()).select_from(LookupDict).where(LookupDict.user_id == user_id)
    )
    count = result.scalar() or 0
    if count > 0:
        return

    defaults = [
        # security_level
        {"category": "security_level", "code": "public",        "name": "公开", "sort_order": 1},
        {"category": "security_level", "code": "internal",      "name": "内部", "sort_order": 2},
        {"category": "security_level", "code": "confidential",  "name": "机密", "sort_order": 3},
        {"category": "security_level", "code": "secret",        "name": "秘密", "sort_order": 4},
        {"category": "security_level", "code": "top_secret",    "name": "绝密", "sort_order": 5},
        # retention_period
        {"category": "retention_period", "code": "permanent",   "name": "永久", "sort_order": 1},
        {"category": "retention_period", "code": "30years",     "name": "30年", "sort_order": 2},
        {"category": "retention_period", "code": "10years",     "name": "10年", "sort_order": 3},
        {"category": "retention_period", "code": "3years",      "name": "3年",  "sort_order": 4},
        # rating
        {"category": "rating", "code": "excellent", "name": "优秀", "sort_order": 1},
        {"category": "rating", "code": "good",      "name": "良好", "sort_order": 2},
        {"category": "rating", "code": "average",   "name": "一般", "sort_order": 3},
        {"category": "rating", "code": "poor",      "name": "较差", "sort_order": 4},
    ]
    for d in defaults:
        db.add(LookupDict(
            user_id=user_id,
            category=d["category"],
            code=d["code"],
            name=d["name"],
            sort_order=d["sort_order"],
            is_active=True,
        ))
    await db.flush()


# ── 端点 ─────────────────────────────────────────────────────

@router.get("", summary="获取字典列表（可按 category 筛选）")
async def list_lookup(
    category: Optional[str] = Query(None, description="分类筛选"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _seed_default_lookup_dicts(db, user.id)
    stmt = select(LookupDict).where(LookupDict.user_id == user.id)
    if category:
        stmt = stmt.where(LookupDict.category == category)
    stmt = stmt.order_by(LookupDict.category, LookupDict.sort_order, LookupDict.id)

    result = await db.execute(stmt)
    items = result.scalars().all()

    return {
        "code": 0,
        "data": [_lookup_to_dict(it) for it in items],
        "total": len(items),
    }


@router.get("/categories", summary="获取所有字典分类")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _seed_default_lookup_dicts(db, user.id)
    stmt = (
        select(LookupDict.category)
        .where(LookupDict.user_id == user.id)
        .distinct()
        .order_by(LookupDict.category)
    )
    result = await db.execute(stmt)
    categories = [r for r in result.scalars().all() if r]

    return {"code": 0, "data": categories, "total": len(categories)}


@router.post("", summary="创建字典项")
async def create_lookup(
    body: LookupDictCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 检查唯一性
    existing = await db.execute(
        select(LookupDict).where(
            LookupDict.user_id == user.id,
            LookupDict.category == body.category,
            LookupDict.code == body.code,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"字典项 {body.category}/{body.code} 已存在")

    item = LookupDict(
        user_id=user.id,
        category=body.category,
        code=body.code,
        name=body.name,
        sort_order=body.sort_order,
        is_active=body.is_active,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return {"code": 0, "data": _lookup_to_dict(item)}


@router.get("/{lookup_id}", summary="获取字典项详情")
async def get_lookup(
    lookup_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LookupDict).where(
            LookupDict.id == lookup_id,
            LookupDict.user_id == user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "字典项不存在")

    return {"code": 0, "data": _lookup_to_dict(item)}


@router.patch("/{lookup_id}", summary="更新字典项")
async def update_lookup(
    lookup_id: int,
    body: LookupDictUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LookupDict).where(
            LookupDict.id == lookup_id,
            LookupDict.user_id == user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "字典项不存在")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    return {"code": 0, "data": _lookup_to_dict(item)}


@router.delete("/{lookup_id}", summary="删除字典项")
async def delete_lookup(
    lookup_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LookupDict).where(
            LookupDict.id == lookup_id,
            LookupDict.user_id == user.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "字典项不存在")

    await db.delete(item)
    await db.commit()

    return {"code": 0, "message": "已删除"}
