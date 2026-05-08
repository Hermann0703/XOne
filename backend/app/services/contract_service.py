"""合同管理模块服务层 — 全宗/分类/密级/合同/里程碑 业务逻辑"""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import select, func, and_, or_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.contract import Fonds, Category, Classification, Contract, Milestone


# ══════════════════════════════════════════════════════════════════════
#  全宗 (Fonds) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_fonds(db: AsyncSession) -> list[Fonds]:
    """获取所有全宗，按排序字段升序"""
    stmt = select(Fonds).order_by(Fonds.sort_order.asc(), Fonds.id.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_fonds(db: AsyncSession, fonds_id: int) -> Optional[Fonds]:
    """获取单个全宗"""
    stmt = select(Fonds).where(Fonds.id == fonds_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_fonds(db: AsyncSession, data: dict) -> Fonds:
    """创建全宗"""
    fonds = Fonds(
        name=data["name"],
        code=data["code"],
        description=data.get("description"),
        sort_order=data.get("sort_order", 0),
    )
    db.add(fonds)
    await db.flush()
    await db.refresh(fonds)
    return fonds


async def update_fonds(db: AsyncSession, fonds_id: int, data: dict) -> Optional[Fonds]:
    """更新全宗"""
    stmt = select(Fonds).where(Fonds.id == fonds_id)
    result = await db.execute(stmt)
    fonds = result.scalar_one_or_none()
    if not fonds:
        return None

    for field in ("name", "code", "description", "sort_order"):
        if field in data:
            setattr(fonds, field, data[field])

    await db.flush()
    await db.refresh(fonds)
    return fonds


async def delete_fonds(db: AsyncSession, fonds_id: int) -> bool:
    """删除全宗"""
    stmt = select(Fonds).where(Fonds.id == fonds_id)
    result = await db.execute(stmt)
    fonds = result.scalar_one_or_none()
    if not fonds:
        return False

    await db.delete(fonds)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  分类 (Category) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_categories(
    db: AsyncSession, fonds_id: Optional[int] = None
) -> list[Category]:
    """获取分类列表，支持按全宗筛选"""
    conditions = []
    if fonds_id is not None:
        conditions.append(Category.fonds_id == fonds_id)

    stmt = (
        select(Category)
        .where(and_(*conditions) if conditions else True)
        .options(selectinload(Category.fonds))
        .order_by(Category.sort_order.asc(), Category.id.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_category(db: AsyncSession, category_id: int) -> Optional[Category]:
    """获取单个分类"""
    stmt = (
        select(Category)
        .where(Category.id == category_id)
        .options(selectinload(Category.fonds))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_category(db: AsyncSession, data: dict) -> Category:
    """创建分类"""
    category = Category(
        name=data["name"],
        code=data["code"],
        fonds_id=data["fonds_id"],
        parent_id=data.get("parent_id"),
        description=data.get("description"),
        sort_order=data.get("sort_order", 0),
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    if category.fonds_id:
        await db.refresh(category, ["fonds"])
    return category


async def update_category(db: AsyncSession, category_id: int, data: dict) -> Optional[Category]:
    """更新分类"""
    stmt = (
        select(Category)
        .where(Category.id == category_id)
        .options(selectinload(Category.fonds))
    )
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()
    if not category:
        return None

    for field in ("name", "code", "fonds_id", "parent_id", "description", "sort_order"):
        if field in data:
            setattr(category, field, data[field])

    await db.flush()
    await db.refresh(category, ["fonds"])
    return category


async def delete_category(db: AsyncSession, category_id: int) -> bool:
    """删除分类"""
    stmt = select(Category).where(Category.id == category_id)
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()
    if not category:
        return False

    await db.delete(category)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  密级 (Classification) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_classifications(db: AsyncSession) -> list[Classification]:
    """获取所有密级"""
    stmt = select(Classification).order_by(Classification.level.asc(), Classification.id.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_classification(db: AsyncSession, classification_id: int) -> Optional[Classification]:
    """获取单个密级"""
    stmt = select(Classification).where(Classification.id == classification_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_classification(db: AsyncSession, data: dict) -> Classification:
    """创建密级"""
    classification = Classification(
        name=data["name"],
        code=data["code"],
        level=data["level"],
        description=data.get("description"),
        color=data.get("color"),
    )
    db.add(classification)
    await db.flush()
    await db.refresh(classification)
    return classification


async def update_classification(db: AsyncSession, classification_id: int, data: dict) -> Optional[Classification]:
    """更新密级"""
    stmt = select(Classification).where(Classification.id == classification_id)
    result = await db.execute(stmt)
    classification = result.scalar_one_or_none()
    if not classification:
        return None

    for field in ("name", "code", "level", "description", "color"):
        if field in data:
            setattr(classification, field, data[field])

    await db.flush()
    await db.refresh(classification)
    return classification


async def delete_classification(db: AsyncSession, classification_id: int) -> bool:
    """删除密级"""
    stmt = select(Classification).where(Classification.id == classification_id)
    result = await db.execute(stmt)
    classification = result.scalar_one_or_none()
    if not classification:
        return False

    await db.delete(classification)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  合同 (Contract) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_contracts(
    db: AsyncSession,
    user_id: int,
    fonds_id: Optional[int] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    contract_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Contract], int]:
    """获取合同列表，支持分页+多条件筛选+搜索"""
    conditions = [Contract.user_id == user_id]

    if fonds_id is not None:
        conditions.append(Contract.fonds_id == fonds_id)
    if category_id is not None:
        conditions.append(Contract.category_id == category_id)
    if status is not None:
        conditions.append(Contract.status == status)
    if contract_type is not None:
        conditions.append(Contract.contract_type == contract_type)
    if search is not None and search.strip():
        search_term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Contract.contract_no.ilike(search_term),
                Contract.title.ilike(search_term),
                Contract.party_a.ilike(search_term),
                Contract.party_b.ilike(search_term),
                Contract.keywords.ilike(search_term),
            )
        )

    where_clause = and_(*conditions)

    # 总数
    count_stmt = select(func.count()).select_from(Contract).where(where_clause)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    # 分页列表
    stmt = (
        select(Contract)
        .where(where_clause)
        .options(
            selectinload(Contract.fonds),
            selectinload(Contract.category),
            selectinload(Contract.classification),
        )
        .order_by(Contract.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return items, total


async def get_contract(db: AsyncSession, contract_id: int, user_id: int) -> Optional[Contract]:
    """获取单个合同"""
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id, Contract.user_id == user_id)
        .options(
            selectinload(Contract.fonds),
            selectinload(Contract.category),
            selectinload(Contract.classification),
            selectinload(Contract.milestones),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_contract(db: AsyncSession, user_id: int, data: dict) -> Contract:
    """创建合同"""
    contract = Contract(
        user_id=user_id,
        contract_no=data["contract_no"],
        title=data["title"],
        fonds_id=data["fonds_id"],
        category_id=data["category_id"],
        classification_id=data["classification_id"],
        party_a=data["party_a"],
        party_b=data["party_b"],
        amount=data["amount"],
        currency=data.get("currency", "CNY"),
        sign_date=data.get("sign_date"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        status=data.get("status", "draft"),
        contract_type=data.get("contract_type", "other"),
        description=data.get("description"),
        keywords=data.get("keywords"),
    )
    db.add(contract)
    await db.flush()
    await db.refresh(contract)
    await db.refresh(contract, ["fonds", "category", "classification"])
    return contract


async def update_contract(
    db: AsyncSession, contract_id: int, user_id: int, data: dict
) -> Optional[Contract]:
    """更新合同"""
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id, Contract.user_id == user_id)
        .options(
            selectinload(Contract.fonds),
            selectinload(Contract.category),
            selectinload(Contract.classification),
        )
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()
    if not contract:
        return None

    updatable = (
        "contract_no", "title", "fonds_id", "category_id", "classification_id",
        "party_a", "party_b", "amount", "currency", "sign_date", "start_date",
        "end_date", "status", "contract_type", "description", "keywords",
    )
    for field in updatable:
        if field in data:
            setattr(contract, field, data[field])

    await db.flush()
    await db.refresh(contract, ["fonds", "category", "classification"])
    return contract


async def delete_contract(db: AsyncSession, contract_id: int, user_id: int) -> bool:
    """删除合同（级联删除里程碑）"""
    stmt = select(Contract).where(
        Contract.id == contract_id, Contract.user_id == user_id
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()
    if not contract:
        return False

    await db.delete(contract)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  里程碑 (Milestone) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_milestones(
    db: AsyncSession, contract_id: int, user_id: int
) -> list[Milestone]:
    """获取合同的所有里程碑"""
    # 先验证合同属于该用户
    contract_check = await get_contract(db, contract_id, user_id)
    if not contract_check:
        return []

    stmt = (
        select(Milestone)
        .where(Milestone.contract_id == contract_id)
        .order_by(Milestone.sort_order.asc(), Milestone.id.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_milestone(
    db: AsyncSession, contract_id: int, user_id: int, data: dict
) -> Optional[Milestone]:
    """为合同创建里程碑"""
    # 验证合同属于该用户
    contract_check = await get_contract(db, contract_id, user_id)
    if not contract_check:
        return None

    milestone = Milestone(
        contract_id=contract_id,
        name=data["name"],
        amount=data.get("amount", 0),
        due_date=data.get("due_date"),
        completed_date=data.get("completed_date"),
        status=data.get("status", "pending"),
        sort_order=data.get("sort_order", 0),
        description=data.get("description"),
    )
    db.add(milestone)
    await db.flush()
    await db.refresh(milestone)
    return milestone


async def update_milestone(
    db: AsyncSession, milestone_id: int, user_id: int, data: dict
) -> Optional[Milestone]:
    """更新里程碑"""
    # 通过合同验证用户权限
    stmt = (
        select(Milestone)
        .where(Milestone.id == milestone_id)
        .options(selectinload(Milestone.contract))
    )
    result = await db.execute(stmt)
    milestone = result.scalar_one_or_none()
    if not milestone or milestone.contract.user_id != user_id:
        return None

    for field in ("name", "amount", "due_date", "completed_date", "status", "sort_order", "description"):
        if field in data:
            setattr(milestone, field, data[field])

    await db.flush()
    await db.refresh(milestone)
    return milestone


async def delete_milestone(db: AsyncSession, milestone_id: int, user_id: int) -> bool:
    """删除里程碑"""
    stmt = (
        select(Milestone)
        .where(Milestone.id == milestone_id)
        .options(selectinload(Milestone.contract))
    )
    result = await db.execute(stmt)
    milestone = result.scalar_one_or_none()
    if not milestone or milestone.contract.user_id != user_id:
        return False

    await db.delete(milestone)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  合同仪表盘
# ══════════════════════════════════════════════════════════════════════

async def get_contract_dashboard(db: AsyncSession, user_id: int) -> dict:
    """合同仪表盘聚合数据"""
    today = date.today()

    # 合同总数
    total_stmt = (
        select(func.count())
        .select_from(Contract)
        .where(Contract.user_id == user_id)
    )
    total = (await db.execute(total_stmt)).scalar() or 0

    # 按状态分布
    status_stmt = (
        select(Contract.status, func.count().label("count"))
        .where(Contract.user_id == user_id)
        .group_by(Contract.status)
    )
    status_result = await db.execute(status_stmt)
    by_status = [
        {"status": row.status, "count": row.count}
        for row in status_result.all()
    ]

    # 按类型分布
    type_stmt = (
        select(Contract.contract_type, func.count().label("count"))
        .where(Contract.user_id == user_id)
        .group_by(Contract.contract_type)
    )
    type_result = await db.execute(type_stmt)
    by_type = [
        {"contract_type": row.contract_type, "count": row.count}
        for row in type_result.all()
    ]

    # 到期合同（未终止且结束日期在今天之前）
    expiring_stmt = (
        select(func.count())
        .select_from(Contract)
        .where(
            Contract.user_id == user_id,
            Contract.status != "terminated",
            Contract.end_date < today,
        )
    )
    expiring = (await db.execute(expiring_stmt)).scalar() or 0

    # 即将到期（30天内）
    from datetime import timedelta
    upcoming = today + timedelta(days=30)
    upcoming_stmt = (
        select(func.count())
        .select_from(Contract)
        .where(
            Contract.user_id == user_id,
            Contract.status.notin_(["terminated", "completed"]),
            Contract.end_date >= today,
            Contract.end_date <= upcoming,
        )
    )
    upcoming_count = (await db.execute(upcoming_stmt)).scalar() or 0

    # 近6月趋势（按月统计创建合同数）
    trends = []
    for i in range(5, -1, -1):
        year = today.year
        month = today.month - i
        if month <= 0:
            month += 12
            year -= 1

        month_stmt = (
            select(func.count())
            .select_from(Contract)
            .where(
                Contract.user_id == user_id,
                extract("year", Contract.created_at) == year,
                extract("month", Contract.created_at) == month,
            )
        )
        count = (await db.execute(month_stmt)).scalar() or 0
        trends.append({
            "year": year,
            "month": month,
            "label": f"{year}-{month:02d}",
            "count": count,
        })

    # 按全宗统计合同数
    fonds_stmt = (
        select(Fonds.name, func.count(Contract.id).label("count"))
        .outerjoin(Contract, and_(
            Contract.fonds_id == Fonds.id,
            Contract.user_id == user_id,
        ))
        .group_by(Fonds.id, Fonds.name)
        .order_by(Fonds.sort_order.asc())
    )
    fonds_result = await db.execute(fonds_stmt)
    by_fonds = [
        {"fonds_name": row.name, "count": row.count}
        for row in fonds_result.all()
    ]

    return {
        "total_contracts": total,
        "by_status": by_status,
        "by_type": by_type,
        "expiring_count": expiring,
        "upcoming_expire_count": upcoming_count,
        "monthly_trends": trends,
        "by_fonds": by_fonds,
    }
