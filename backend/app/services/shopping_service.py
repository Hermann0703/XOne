"""购物模块服务层 — 预算 & 购物项业务逻辑"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.shopping import Budget, ShoppingItem


# ── 预算 ──────────────────────────────────────────────────────────────

async def list_budgets(db: AsyncSession, user_id: UUID) -> list[Budget]:
    """获取用户所有预算"""
    stmt = (
        select(Budget)
        .where(Budget.user_id == user_id)
        .order_by(Budget.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_budget(db: AsyncSession, budget_id: int, user_id: UUID) -> Optional[Budget]:
    """获取单个预算"""
    stmt = select(Budget).where(
        Budget.id == budget_id, Budget.user_id == user_id
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_budget(db: AsyncSession, user_id: UUID, data: dict) -> Budget:
    """创建预算"""
    budget = Budget(
        user_id=user_id,
        name=data["name"],
        amount=data["amount"],
        category=data["category"],
        period=data.get("period", "monthly"),
        start_date=data["start_date"],
        end_date=data.get("end_date"),
        notes=data.get("notes"),
        is_active=data.get("is_active", True),
    )
    db.add(budget)
    await db.flush()
    await db.refresh(budget)
    return budget


async def update_budget(
    db: AsyncSession, budget_id: int, user_id: UUID, data: dict
) -> Optional[Budget]:
    """更新预算"""
    stmt = select(Budget).where(
        Budget.id == budget_id, Budget.user_id == user_id
    )
    result = await db.execute(stmt)
    budget = result.scalar_one_or_none()
    if not budget:
        return None

    for field in ("name", "amount", "category", "period", "start_date", "end_date", "notes", "is_active"):
        if field in data:
            setattr(budget, field, data[field])

    await db.flush()
    await db.refresh(budget)
    return budget


async def delete_budget(
    db: AsyncSession, budget_id: int, user_id: UUID
) -> bool:
    """删除预算（关联购物项的 budget_id 置空）"""
    stmt = select(Budget).where(
        Budget.id == budget_id, Budget.user_id == user_id
    )
    result = await db.execute(stmt)
    budget = result.scalar_one_or_none()
    if not budget:
        return False

    await db.delete(budget)
    await db.flush()
    return True


# ── 购物项 ────────────────────────────────────────────────────────────

async def list_items(
    db: AsyncSession,
    user_id: UUID,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    budget_id: Optional[int] = None,
) -> list[ShoppingItem]:
    """获取用户购物清单，支持多条件筛选"""
    conditions = [ShoppingItem.user_id == user_id]

    if status is not None:
        conditions.append(ShoppingItem.status == status)
    if category is not None:
        conditions.append(ShoppingItem.category == category)
    if priority is not None:
        conditions.append(ShoppingItem.priority == priority)
    if budget_id is not None:
        conditions.append(ShoppingItem.budget_id == budget_id)

    stmt = (
        select(ShoppingItem)
        .where(and_(*conditions))
        .options(selectinload(ShoppingItem.budget))
        .order_by(ShoppingItem.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_item(db: AsyncSession, item_id: int, user_id: UUID) -> Optional[ShoppingItem]:
    """获取单个购物项"""
    stmt = (
        select(ShoppingItem)
        .where(ShoppingItem.id == item_id, ShoppingItem.user_id == user_id)
        .options(selectinload(ShoppingItem.budget))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_item(db: AsyncSession, user_id: UUID, data: dict) -> ShoppingItem:
    """创建购物项"""
    item = ShoppingItem(
        user_id=user_id,
        name=data["name"],
        category=data["category"],
        price=data.get("price"),
        quantity=data.get("quantity", 1),
        priority=data.get("priority", "medium"),
        status=data.get("status", "pending"),
        store=data.get("store"),
        url=data.get("url"),
        notes=data.get("notes"),
        budget_id=data.get("budget_id"),
        created_date=data.get("created_date", date.today()),
        purchased_date=data.get("purchased_date"),
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)

    # 重新加载 budget 关联
    if item.budget_id:
        await db.refresh(item, ["budget"])

    return item


async def update_item(
    db: AsyncSession, item_id: int, user_id: UUID, data: dict
) -> Optional[ShoppingItem]:
    """更新购物项"""
    stmt = (
        select(ShoppingItem)
        .where(ShoppingItem.id == item_id, ShoppingItem.user_id == user_id)
        .options(selectinload(ShoppingItem.budget))
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        return None

    # 如果状态变更为 purchased，自动设置购买日期
    if "status" in data and data["status"] == "purchased" and item.status != "purchased":
        item.purchased_date = data.get("purchased_date", date.today())

    for field in ("name", "category", "price", "quantity", "priority",
                   "status", "store", "url", "notes", "budget_id",
                   "created_date", "purchased_date"):
        if field in data:
            setattr(item, field, data[field])

    await db.flush()

    # 若 budget_id 变更，重新查询以加载新的 budget 关联
    if "budget_id" in data and data["budget_id"] != (item.budget_id or 0):
        stmt = (
            select(ShoppingItem)
            .where(ShoppingItem.id == item_id)
            .options(selectinload(ShoppingItem.budget))
        )
        result = await db.execute(stmt)
        item = result.scalar_one()
    else:
        await db.refresh(item)  # 仅加载 onupdate 列（不碰 relationship）

    return item


async def delete_item(
    db: AsyncSession, item_id: int, user_id: UUID
) -> bool:
    """删除购物项"""
    stmt = select(ShoppingItem).where(
        ShoppingItem.id == item_id, ShoppingItem.user_id == user_id
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        return False

    await db.delete(item)
    await db.flush()
    return True


# ── 仪表盘 ────────────────────────────────────────────────────────────

async def get_dashboard(db: AsyncSession, user_id: UUID) -> dict:
    """聚合仪表盘数据：总预算、本月支出、剩余预算、状态分布、最近购买"""
    today = date.today()
    current_month = today.month
    current_year = today.year

    # 总预算数
    total_budgets_stmt = select(func.count()).select_from(Budget).where(
        Budget.user_id == user_id, Budget.is_active == True
    )
    total_budgets = (await db.execute(total_budgets_stmt)).scalar() or 0

    # 本月已购总额（状态为 purchased 且 purchased_date 在本月）
    total_spent_stmt = select(func.coalesce(func.sum(ShoppingItem.price * ShoppingItem.quantity), 0.0)).where(
        ShoppingItem.user_id == user_id,
        ShoppingItem.status == "purchased",
        extract("year", ShoppingItem.purchased_date) == current_year,
        extract("month", ShoppingItem.purchased_date) == current_month,
    )
    total_spent = (await db.execute(total_spent_stmt)).scalar() or 0.0

    # 按分类剩余预算（活跃预算 - 该分类下已购金额）
    budget_stmt = (
        select(Budget.category, func.coalesce(func.sum(Budget.amount), 0.0).label("budget_total"))
        .where(Budget.user_id == user_id, Budget.is_active == True)
        .group_by(Budget.category)
    )
    budget_result = await db.execute(budget_stmt)
    budget_rows = budget_result.all()

    # 按分类的本月已购金额
    spent_stmt = (
        select(ShoppingItem.category, func.coalesce(func.sum(ShoppingItem.price * ShoppingItem.quantity), 0.0).label("spent"))
        .where(
            ShoppingItem.user_id == user_id,
            ShoppingItem.status == "purchased",
            extract("year", ShoppingItem.purchased_date) == current_year,
            extract("month", ShoppingItem.purchased_date) == current_month,
        )
        .group_by(ShoppingItem.category)
    )
    spent_result = await db.execute(spent_stmt)
    spent_by_category = {row.category: float(row.spent) for row in spent_result.all()}

    remaining_by_category = []
    for row in budget_rows:
        category = row.category
        budget_total = float(row.budget_total)
        spent = spent_by_category.get(category, 0.0)
        remaining_by_category.append({
            "category": category,
            "budget": budget_total,
            "spent": spent,
            "remaining": budget_total - spent,
        })

    # 按状态统计购物项数量
    status_stmt = (
        select(ShoppingItem.status, func.count().label("count"))
        .where(ShoppingItem.user_id == user_id)
        .group_by(ShoppingItem.status)
    )
    status_result = await db.execute(status_stmt)
    items_by_status = [
        {"status": row.status, "count": row.count}
        for row in status_result.all()
    ]

    # 最近5笔已购记录
    recent_stmt = (
        select(ShoppingItem)
        .where(ShoppingItem.user_id == user_id, ShoppingItem.status == "purchased")
        .options(selectinload(ShoppingItem.budget))
        .order_by(ShoppingItem.purchased_date.desc().nullslast(), ShoppingItem.updated_at.desc())
        .limit(5)
    )
    recent_result = await db.execute(recent_stmt)
    recent_purchases = list(recent_result.scalars().all())

    return {
        "total_budgets": total_budgets,
        "total_spent": float(total_spent),
        "remaining_by_category": remaining_by_category,
        "items_by_status": items_by_status,
        "recent_purchases": recent_purchases,
    }
