"""合同管理模块服务层 — 全宗/分类/密级/合同/里程碑 业务逻辑"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_, or_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.contract import Fonds, Category, Classification, Contract, Milestone, LifecycleTemplate, LifecycleStage, ContractStageLog, TimelineTemplate, TimelineNode, ContractTimelineCustomNode
from app.models.supplier import Supplier


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
    user_id: UUID,
    fonds_id: Optional[int] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    contract_type: Optional[str] = None,  # deprecated — prefer contract_type_id
    contract_type_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Contract], int]:
    """获取合同列表，支持分页+多条件筛选+搜索"""
    conditions = []

    if fonds_id is not None:
        conditions.append(Contract.fonds_id == fonds_id)
    if category_id is not None:
        conditions.append(Contract.category_id == category_id)
    if status is not None:
        conditions.append(Contract.status == status)
    if contract_type is not None:
        conditions.append(Contract.contract_type == contract_type)
    if contract_type_id is not None:
        conditions.append(Contract.contract_type_id == contract_type_id)
    if search is not None and search.strip():
        search_term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Contract.contract_no.ilike(search_term),
                Contract.contract_name.ilike(search_term),
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
            selectinload(Contract.supplier_rel),
            selectinload(Contract.lifecycle),
            selectinload(Contract.lifecycle_stage),
            selectinload(Contract.contract_type_rel),
        )
        .order_by(Contract.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return items, total


async def get_contract(db: AsyncSession, contract_id: int, user_id: UUID) -> Optional[Contract]:
    """获取单个合同"""
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id)
        .options(
            selectinload(Contract.fonds),
            selectinload(Contract.category),
            selectinload(Contract.classification),
            selectinload(Contract.supplier_rel),
            selectinload(Contract.milestones),
            selectinload(Contract.lifecycle),
            selectinload(Contract.lifecycle_stage),
            selectinload(Contract.contract_type_rel),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_contract(db: AsyncSession, user_id: UUID, data: dict) -> Contract:
    """创建合同"""
    contract = Contract(
        user_id=user_id,
        contract_no=data["contract_no"],
        contract_name=data["contract_name"],
        fonds_id=data["fonds_id"],
        category_id=data["category_id"],
        classification_id=data["classification_id"],
        supplier_id=data.get("supplier_id"),
        amount=data["amount"],
        currency=data.get("currency", "CNY"),
        sign_date=data.get("sign_date"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        status=data.get("status", "draft"),
        contract_type=data.get("contract_type", "other"),  # deprecated
        contract_type_id=data.get("contract_type_id"),
        description=data.get("description"),
        keywords=data.get("keywords"),
        requirement_no=data.get("requirement_no"),
        subject_no=data.get("subject_no"),
        procurement_no=data.get("procurement_no"),
        subject_name=data.get("subject_name"),
        auto_renewal=data.get("auto_renewal", False),
        renewal_remind_days=data.get("renewal_remind_days", 7),
    )
    db.add(contract)
    await db.flush()
    await db.refresh(contract)
    await db.refresh(contract, ["fonds", "category", "classification", "contract_type_rel", "supplier_rel"])

    # 如果指定了生命周期模板，自动绑定到第一个阶段
    if data.get("lifecycle_id"):
        tmpl = await get_lifecycle_template(db, data["lifecycle_id"], user_id)
        if tmpl:
            contract.lifecycle_id = tmpl.id
            if tmpl.stages:
                first_stage = sorted(tmpl.stages, key=lambda s: s.sort_order)[0]
                contract.lifecycle_stage_id = first_stage.id
            await db.flush()
            await db.refresh(contract, ["lifecycle", "lifecycle_stage"])

    return contract


async def update_contract(
    db: AsyncSession, contract_id: int, user_id: UUID, data: dict
) -> Optional[Contract]:
    """更新合同"""
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id)
        .options(
            selectinload(Contract.fonds),
            selectinload(Contract.category),
            selectinload(Contract.classification),
            selectinload(Contract.supplier_rel),
        )
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()
    if not contract:
        return None

    updatable = (
        "contract_no", "contract_name", "fonds_id", "category_id", "classification_id",
        "supplier_id", "amount", "currency", "sign_date", "start_date",
        "end_date", "status", "contract_type", "contract_type_id", "description", "keywords",
        "requirement_no", "subject_no", "procurement_no", "subject_name",
        "lifecycle_id", "auto_renewal", "renewal_remind_days", "timeline_template_id",
    )
    for field in updatable:
        if field in data:
            setattr(contract, field, data[field])

    await db.flush()

    # 如果首次设置了生命周期模板，自动绑定到第一个阶段
    if "lifecycle_id" in data and data["lifecycle_id"]:
        tmpl = await get_lifecycle_template(db, data["lifecycle_id"], user_id)
        if tmpl and tmpl.stages:
            first_stage = sorted(tmpl.stages, key=lambda s: s.sort_order)[0]
            contract.lifecycle_stage_id = first_stage.id
            await db.flush()

    # 重新查询以确保所有关系已加载（避免 async session 中的 MissingGreenlet）
    stmt = (
        select(Contract)
        .where(Contract.id == contract.id)
        .options(
            selectinload(Contract.fonds),
            selectinload(Contract.category),
            selectinload(Contract.classification),
            selectinload(Contract.supplier_rel),
            selectinload(Contract.contract_type_rel),
            selectinload(Contract.lifecycle),
            selectinload(Contract.lifecycle_stage),
            selectinload(Contract.milestones),
            selectinload(Contract.stage_logs),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one()

async def delete_contract(db: AsyncSession, contract_id: int, user_id: UUID) -> bool:
    """删除合同（级联删除里程碑）"""
    stmt = select(Contract).where(
        Contract.id == contract_id
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
    db: AsyncSession, contract_id: int, user_id: UUID
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
    db: AsyncSession, contract_id: int, user_id: UUID, data: dict
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
    db: AsyncSession, milestone_id: int, user_id: UUID, data: dict
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
    if not milestone:
        return None

    for field in ("name", "amount", "due_date", "completed_date", "status", "sort_order", "description"):
        if field in data:
            setattr(milestone, field, data[field])

    await db.flush()
    await db.refresh(milestone)
    return milestone


async def delete_milestone(db: AsyncSession, milestone_id: int, user_id: UUID) -> bool:
    """删除里程碑"""
    stmt = (
        select(Milestone)
        .where(Milestone.id == milestone_id)
        .options(selectinload(Milestone.contract))
    )
    result = await db.execute(stmt)
    milestone = result.scalar_one_or_none()
    if not milestone:
        return False

    await db.delete(milestone)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  供应商 (Supplier) CRUD
# ══════════════════════════════════════════════════════════════════════


async def list_suppliers(
    db: AsyncSession,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Supplier], int]:
    """获取供应商列表，支持分页+搜索+状态筛选"""
    from uuid import UUID as PyUUID

    conditions = []

    if status is not None:
        conditions.append(Supplier.status == status)
    if search is not None and search.strip():
        search_term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Supplier.name.ilike(search_term),
                Supplier.contact_person.ilike(search_term),
                Supplier.business_license.ilike(search_term),
            )
        )

    where_clause = and_(*conditions)

    # 总数
    count_stmt = select(func.count()).select_from(Supplier).where(where_clause)
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    # 分页列表
    stmt = (
        select(Supplier)
        .where(where_clause)
        .order_by(Supplier.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return items, total


async def get_supplier(db: AsyncSession, supplier_id: str, user_id: UUID) -> Optional[Supplier]:
    """获取单个供应商"""
    from uuid import UUID as PyUUID

    try:
        sid = PyUUID(supplier_id)
    except ValueError:
        return None

    stmt = select(Supplier).where(Supplier.id == sid)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_supplier(db: AsyncSession, user_id: UUID, data: dict) -> Supplier:
    """创建供应商"""
    supplier = Supplier(
        user_id=user_id,
        name=data["name"],
        contact_person=data.get("contact_person"),
        contact_phone=data.get("contact_phone"),
        address=data.get("address"),
        business_license=data.get("business_license"),
        tax_id=data.get("tax_id"),
        bank_name=data.get("bank_name"),
        bank_account=data.get("bank_account"),
        rating=data.get("rating"),
        status=data.get("status", "active"),
        notes=data.get("notes"),
    )
    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)
    return supplier


async def update_supplier(
    db: AsyncSession, supplier_id: str, user_id: UUID, data: dict
) -> Optional[Supplier]:
    """更新供应商"""
    from uuid import UUID as PyUUID

    try:
        sid = PyUUID(supplier_id)
    except ValueError:
        return None

    stmt = select(Supplier).where(Supplier.id == sid)
    result = await db.execute(stmt)
    supplier = result.scalar_one_or_none()
    if not supplier:
        return None

    updatable = (
        "name", "contact_person", "contact_phone", "address",
        "business_license", "tax_id", "bank_name", "bank_account",
        "rating", "status", "notes",
    )
    for field in updatable:
        if field in data:
            setattr(supplier, field, data[field])

    await db.flush()
    await db.refresh(supplier)
    return supplier


async def delete_supplier(db: AsyncSession, supplier_id: str, user_id: UUID) -> bool:
    """删除供应商"""
    from uuid import UUID as PyUUID

    try:
        sid = PyUUID(supplier_id)
    except ValueError:
        return False

    stmt = select(Supplier).where(Supplier.id == sid)
    result = await db.execute(stmt)
    supplier = result.scalar_one_or_none()
    if not supplier:
        return False

    await db.delete(supplier)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  合同仪表盘
# ══════════════════════════════════════════════════════════════════════

async def get_contract_dashboard(db: AsyncSession, user_id: UUID) -> dict:
    """合同仪表盘聚合数据"""
    from datetime import timedelta

    today = date.today()

    # ── summary ──
    total_stmt = (
        select(func.count())
        .select_from(Contract)
        .where(True)
    )
    total = (await db.execute(total_stmt)).scalar() or 0

    total_amount_stmt = (
        select(func.coalesce(func.sum(Contract.amount), 0))
        .select_from(Contract)
        .where(True)
    )
    total_amount = float((await db.execute(total_amount_stmt)).scalar() or 0)

    # 按状态计数
    status_stmt = (
        select(Contract.status, func.count().label("count"))
        .where(True)
        .group_by(Contract.status)
    )
    status_result = await db.execute(status_stmt)
    status_map = {row.status: row.count for row in status_result.all()}

    summary = {
        "total_contracts": total,
        "total_amount": total_amount,
        "active_count": status_map.get("in_progress", 0) + status_map.get("signed", 0),
        "completed_count": status_map.get("completed", 0),
        "terminated_count": status_map.get("terminated", 0),
        "draft_count": status_map.get("draft", 0),
    }

    # ── performance (里程碑维度) ──
    total_ms_stmt = (
        select(func.count())
        .select_from(Milestone)
        .join(Contract, Milestone.contract_id == Contract.id)
        .where(True)
    )
    total_milestones = (await db.execute(total_ms_stmt)).scalar() or 0

    completed_ms_stmt = (
        select(func.count())
        .select_from(Milestone)
        .join(Contract, Milestone.contract_id == Contract.id)
        .where(Milestone.status == "completed")
    )
    completed_milestones = (await db.execute(completed_ms_stmt)).scalar() or 0

    overdue_ms_stmt = (
        select(func.count())
        .select_from(Milestone)
        .join(Contract, Milestone.contract_id == Contract.id)
        .where(Milestone.status == "overdue")
    )
    overdue_count = (await db.execute(overdue_ms_stmt)).scalar() or 0

    on_time_rate = (
        round(completed_milestones / total_milestones, 2)
        if total_milestones > 0 else 0
    )

    performance = {
        "on_time_rate": on_time_rate,
        "overdue_count": overdue_count,
        "total_milestones": total_milestones,
        "completed_milestones": completed_milestones,
    }

    # ── by_status ──
    by_status = [
        {"status": status, "count": count}
        for status, count in status_map.items()
    ]

    # ── by_type ──
    type_stmt = (
        select(Contract.contract_type, func.count().label("count"))
        .where(True)
        .group_by(Contract.contract_type)
    )
    type_result = await db.execute(type_stmt)
    by_type = [
        {"contract_type": row.contract_type, "count": row.count}
        for row in type_result.all()
    ]

    # ── monthly_trends ──
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

    # ── by_fonds ──
    fonds_stmt = (
        select(Fonds.name, func.count(Contract.id).label("count"))
        .outerjoin(Contract, and_(
            Contract.fonds_id == Fonds.id,
        ))
        .group_by(Fonds.id, Fonds.name)
        .order_by(Fonds.sort_order.asc())
    )
    fonds_result = await db.execute(fonds_stmt)
    by_fonds = [
        {"fonds_name": row.name, "count": row.count}
        for row in fonds_result.all()
    ]

    # ── expiring_soon (30天内到期) ──
    upcoming = today + timedelta(days=30)
    expiring_stmt = (
        select(Contract)
        .where(
            Contract.status.notin_(["terminated", "completed"]),
            Contract.end_date >= today,
            Contract.end_date <= upcoming,
        )
        .options(selectinload(Contract.fonds))
        .order_by(Contract.end_date.asc())
    )
    expiring_result = await db.execute(expiring_stmt)
    expiring_soon = []
    for ct in expiring_result.scalars().all():
        expiring_soon.append({
            "id": ct.id,
            "contract_no": ct.contract_no,
            "contract_name": ct.contract_name,
            "end_date": ct.end_date.isoformat() if ct.end_date else None,
            "status": ct.status,
            "fonds_name": ct.fonds.name if ct.fonds else None,
        })

    return {
        "summary": summary,
        "performance": performance,
        "by_type": by_type,
        "by_status": by_status,
        "monthly_trends": trends,
        "by_fonds": by_fonds,
        "expiring_soon": expiring_soon,
    }


# ══════════════════════════════════════════════════════════════════════
#  生命周期模板 (LifecycleTemplate) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_lifecycle_templates(
    db: AsyncSession, user_id: UUID
) -> list[LifecycleTemplate]:
    stmt = (
        select(LifecycleTemplate)
        .where(True)
        .options(selectinload(LifecycleTemplate.stages))
        .order_by(LifecycleTemplate.updated_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_lifecycle_template(
    db: AsyncSession, template_id: int, user_id: UUID
) -> Optional[LifecycleTemplate]:
    stmt = (
        select(LifecycleTemplate)
        .where(LifecycleTemplate.id == template_id)
        .options(selectinload(LifecycleTemplate.stages))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_lifecycle_template(
    db: AsyncSession, user_id: UUID, data: dict
) -> LifecycleTemplate:
    template = LifecycleTemplate(
        user_id=user_id,
        name=data["name"],
        description=data.get("description"),
        is_active=data.get("is_active", True),
    )
    db.add(template)
    await db.flush()
    # 重新查询以加载 selectin 关系，避免 MissingGreenlet
    result = await db.execute(
        select(LifecycleTemplate)
        .options(selectinload(LifecycleTemplate.stages))
        .where(LifecycleTemplate.id == template.id)
    )
    return result.scalar_one()


async def update_lifecycle_template(
    db: AsyncSession, template_id: int, user_id: UUID, data: dict
) -> Optional[LifecycleTemplate]:
    stmt = (
        select(LifecycleTemplate)
        .where(LifecycleTemplate.id == template_id)
        .options(selectinload(LifecycleTemplate.stages))
    )
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    if not template:
        return None
    for field in ("name", "description", "is_active"):
        if field in data:
            setattr(template, field, data[field])
    await db.flush()
    return template


async def delete_lifecycle_template(
    db: AsyncSession, template_id: int, user_id: UUID
) -> bool:
    stmt = select(LifecycleTemplate).where(
        LifecycleTemplate.id == template_id
    )
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    if not template:
        return False
    await db.delete(template)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  生命周期阶段 (LifecycleStage) CRUD
# ══════════════════════════════════════════════════════════════════════

async def add_lifecycle_stage(
    db: AsyncSession, template_id: int, user_id: UUID, data: dict
) -> Optional[LifecycleStage]:
    tmpl = await get_lifecycle_template(db, template_id, user_id)
    if not tmpl:
        return None
    stage = LifecycleStage(
        template_id=template_id,
        name=data["name"],
        stage_type=data.get("stage_type", "custom"),
        sort_order=data.get("sort_order", 0),
        description=data.get("description"),
        color=data.get("color"),
        is_required=data.get("is_required", True),
        auto_transition_days=data.get("auto_transition_days", 0),
    )
    db.add(stage)
    await db.flush()
    await db.refresh(stage)
    return stage


async def update_lifecycle_stage(
    db: AsyncSession, stage_id: int, user_id: UUID, data: dict
) -> Optional[LifecycleStage]:
    stmt = (
        select(LifecycleStage)
        .where(LifecycleStage.id == stage_id)
        .options(selectinload(LifecycleStage.template))
    )
    result = await db.execute(stmt)
    stage = result.scalar_one_or_none()
    if not stage:
        return None
    for field in (
        "name", "stage_type", "sort_order", "description",
        "color", "is_required", "auto_transition_days",
    ):
        if field in data:
            setattr(stage, field, data[field])
    await db.flush()
    await db.refresh(stage)
    return stage


async def delete_lifecycle_stage(
    db: AsyncSession, stage_id: int, user_id: UUID
) -> bool:
    stmt = (
        select(LifecycleStage)
        .where(LifecycleStage.id == stage_id)
        .options(selectinload(LifecycleStage.template))
    )
    result = await db.execute(stmt)
    stage = result.scalar_one_or_none()
    if not stage:
        return False
    await db.delete(stage)
    await db.flush()
    return True


async def reorder_lifecycle_stages(
    db: AsyncSession, template_id: int, user_id: UUID, stage_ids: list[int]
) -> bool:
    tmpl = await get_lifecycle_template(db, template_id, user_id)
    if not tmpl:
        return False
    for idx, stage_id in enumerate(stage_ids):
        stmt = select(LifecycleStage).where(
            LifecycleStage.id == stage_id, LifecycleStage.template_id == template_id
        )
        result = await db.execute(stmt)
        stage = result.scalar_one_or_none()
        if stage:
            stage.sort_order = idx + 1
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  合同生命周期流转
# ══════════════════════════════════════════════════════════════════════

async def get_contract_lifecycle(
    db: AsyncSession, contract_id: int, user_id: UUID
) -> Optional[dict]:
    contract = await get_contract(db, contract_id, user_id)
    if not contract:
        return None
    if not contract.lifecycle_id:
        return {"contract_id": contract_id, "has_lifecycle": False}
    tmpl = await get_lifecycle_template(db, contract.lifecycle_id, user_id)
    history = await get_contract_stage_history(db, contract_id, user_id)

    # ── 阶段时间统计 ──
    now = datetime.now()
    # history 是 DESC，反转成 ASC 计算时序
    asc_logs = list(reversed(history))
    stage_stats: dict = {}  # {stage_id: {entered_at, left_at, duration_hours}}

    for log in asc_logs:
        # 进入 to_stage
        if log.to_stage_id not in stage_stats:
            stage_stats[log.to_stage_id] = {
                "entered_at": log.created_at.isoformat() if log.created_at else None,
                "left_at": None,
                "duration_hours": None,
            }
        # 离开 from_stage（被后一条记录覆盖）——只记录第一次离开时间
        if log.from_stage_id and log.from_stage_id in stage_stats:
            if stage_stats[log.from_stage_id]["left_at"] is None:
                stage_stats[log.from_stage_id]["left_at"] = log.created_at.isoformat() if log.created_at else None

    # 计算每个阶段的时长（小时）
    for sid, stat in stage_stats.items():
        entered = stat.get("entered_at")
        left = stat.get("left_at")
        if entered:
            et = datetime.fromisoformat(entered)
            lt = datetime.fromisoformat(left) if left else now
            stat["duration_hours"] = round((lt - et).total_seconds() / 3600, 1)

    return {
        "contract_id": contract_id,
        "has_lifecycle": True,
        "template": _lifecycle_template_to_dict(tmpl) if tmpl else None,
        "current_stage": _lifecycle_stage_to_dict(contract.lifecycle_stage) if contract.lifecycle_stage else None,
        "current_stage_id": contract.lifecycle_stage_id,
        "history": [_stage_log_to_dict(log) for log in history],
        "stage_stats": stage_stats,
        "stage_links": contract.stage_links or {},
    }


async def update_stage_links(
    db: AsyncSession, contract_id: int, user_id: UUID, stage_links: dict
) -> Optional[dict]:
    """更新合同各阶段的补充链接"""
    contract = await get_contract(db, contract_id, user_id)
    if not contract:
        return None
    contract.stage_links = stage_links
    await db.commit()
    await db.refresh(contract)
    return {"contract_id": contract_id, "stage_links": contract.stage_links or {}}


async def advance_contract_stage(
    db: AsyncSession, contract_id: int, user_id: UUID, operator_id: UUID, notes: Optional[str] = None
) -> Optional[dict]:
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id)
        .options(
            selectinload(Contract.lifecycle),
            selectinload(Contract.lifecycle_stage),
        )
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()
    if not contract or not contract.lifecycle_id:
        return None

    tmpl = await get_lifecycle_template(db, contract.lifecycle_id, user_id)
    if not tmpl or not tmpl.stages:
        return None

    stages = sorted(tmpl.stages, key=lambda s: s.sort_order)
    current_idx = next(
        (i for i, s in enumerate(stages) if s.id == contract.lifecycle_stage_id), -1
    )

    if current_idx == -1:
        next_stage = stages[0]
    elif current_idx + 1 >= len(stages):
        return {"error": "already_at_final_stage", "message": "已到达最后一个阶段"}
    else:
        next_stage = stages[current_idx + 1]

    log_rec = ContractStageLog(
        contract_id=contract_id,
        lifecycle_id=contract.lifecycle_id,
        from_stage_id=contract.lifecycle_stage_id,
        to_stage_id=next_stage.id,
        from_stage_name=contract.lifecycle_stage.name if contract.lifecycle_stage else None,
        to_stage_name=next_stage.name,
        triggered_by="manual",
        operator_id=operator_id,
        notes=notes,
    )
    db.add(log_rec)

    old_stage_id = contract.lifecycle_stage_id
    contract.lifecycle_stage_id = next_stage.id

    # 从数据库查询 StageType 获取对应状态，找不到则默认 "draft"
    from app.models.contract import StageType
    stmt = select(StageType).where(
        StageType.code == next_stage.stage_type,
    )
    result = await db.execute(stmt)
    stage_type_row = result.scalar_one_or_none()
    new_status = stage_type_row.default_status if stage_type_row else "draft"
    contract.status = new_status

    await db.flush()
    await db.refresh(contract, ["lifecycle_stage"])

    return {
        "from_stage_id": old_stage_id,
        "to_stage_id": next_stage.id,
        "to_stage_name": next_stage.name,
        "current_stage": _lifecycle_stage_to_dict(contract.lifecycle_stage) if contract.lifecycle_stage else None,
        "log": _stage_log_to_dict(log_rec),
    }


async def get_contract_stage_history(
    db: AsyncSession, contract_id: int, user_id: UUID
) -> list[ContractStageLog]:
    contract = await get_contract(db, contract_id, user_id)
    if not contract:
        return []
    stmt = (
        select(ContractStageLog)
        .where(ContractStageLog.contract_id == contract_id)
        .order_by(ContractStageLog.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ── 序列化辅助 ──

def _lifecycle_template_to_dict(t) -> dict:
    return {
        "id": t.id, "user_id": str(t.user_id),
        "name": t.name, "description": t.description,
        "is_active": t.is_active,
        "stages": [_lifecycle_stage_to_dict(s) for s in (t.stages or [])],
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _lifecycle_stage_to_dict(s) -> dict:
    return {
        "id": s.id, "template_id": s.template_id,
        "name": s.name, "stage_type": s.stage_type,
        "sort_order": s.sort_order, "description": s.description,
        "color": s.color, "is_required": s.is_required,
        "auto_transition_days": s.auto_transition_days,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def _stage_log_to_dict(log) -> dict:
    return {
        "id": log.id, "contract_id": log.contract_id,
        "lifecycle_id": log.lifecycle_id,
        "from_stage_id": log.from_stage_id, "to_stage_id": log.to_stage_id,
        "from_stage_name": log.from_stage_name, "to_stage_name": log.to_stage_name,
        "triggered_by": log.triggered_by,
        "operator_id": str(log.operator_id) if log.operator_id else None,
        "notes": log.notes,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


# ══════════════════════════════════════════════════════════════════════
#  时间轴模板 (TimelineTemplate) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_timeline_templates(db: AsyncSession) -> list[TimelineTemplate]:
    """获取所有时间轴模板，按 id 升序"""
    stmt = select(TimelineTemplate).order_by(TimelineTemplate.id.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_timeline_template(db: AsyncSession, data: dict) -> TimelineTemplate:
    """创建时间轴模板"""
    template = TimelineTemplate(
        name=data["name"],
        description=data.get("description"),
        is_active=data.get("is_active", True),
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


async def get_timeline_template(db: AsyncSession, template_id: int) -> Optional[TimelineTemplate]:
    """获取单个时间轴模板（含节点）"""
    stmt = (
        select(TimelineTemplate)
        .where(TimelineTemplate.id == template_id)
        .options(selectinload(TimelineTemplate.nodes))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_timeline_template(
    db: AsyncSession, template_id: int, data: dict
) -> Optional[TimelineTemplate]:
    """更新时间轴模板"""
    stmt = select(TimelineTemplate).where(TimelineTemplate.id == template_id)
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    if not template:
        return None

    for field in ("name", "description", "is_active"):
        if field in data:
            setattr(template, field, data[field])

    await db.flush()
    await db.refresh(template)
    return template


async def delete_timeline_template(db: AsyncSession, template_id: int) -> bool:
    """删除时间轴模板（级联删除节点）"""
    stmt = select(TimelineTemplate).where(TimelineTemplate.id == template_id)
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    if not template:
        return False

    await db.delete(template)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  时间轴节点 (TimelineNode) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_timeline_nodes(db: AsyncSession, template_id: int) -> list[TimelineNode]:
    """获取模板下的所有节点（按 sort_order 排序）"""
    stmt = (
        select(TimelineNode)
        .where(TimelineNode.template_id == template_id)
        .order_by(TimelineNode.sort_order.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_timeline_node(
    db: AsyncSession, template_id: int, data: dict
) -> TimelineNode:
    """在模板中创建节点"""
    node = TimelineNode(
        template_id=template_id,
        label=data["label"],
        sort_order=data.get("sort_order", 0),
        date_source=data.get("date_source"),
        active_statuses=data.get("active_statuses", []),
        icon_type=data.get("icon_type", "circle"),
        is_required=data.get("is_required", True),
        description=data.get("description"),
    )
    db.add(node)
    await db.flush()
    await db.refresh(node)
    return node


async def update_timeline_node(
    db: AsyncSession, node_id: int, data: dict
) -> Optional[TimelineNode]:
    """更新节点"""
    stmt = select(TimelineNode).where(TimelineNode.id == node_id)
    result = await db.execute(stmt)
    node = result.scalar_one_or_none()
    if not node:
        return None

    for field in (
        "label", "sort_order", "date_source", "active_statuses",
        "icon_type", "is_required", "description",
    ):
        if field in data:
            setattr(node, field, data[field])

    await db.flush()
    await db.refresh(node)
    return node


async def delete_timeline_node(db: AsyncSession, node_id: int) -> bool:
    """删除节点"""
    stmt = select(TimelineNode).where(TimelineNode.id == node_id)
    result = await db.execute(stmt)
    node = result.scalar_one_or_none()
    if not node:
        return False

    await db.delete(node)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  合同自定义时间轴节点 (ContractTimelineCustomNode) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_contract_custom_nodes(
    db: AsyncSession, contract_id: int
) -> list[ContractTimelineCustomNode]:
    """获取合同的所有自定义节点（按 sort_order 排序）"""
    stmt = (
        select(ContractTimelineCustomNode)
        .where(ContractTimelineCustomNode.contract_id == contract_id)
        .order_by(ContractTimelineCustomNode.sort_order.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_contract_custom_node(
    db: AsyncSession, contract_id: int, data: dict
) -> ContractTimelineCustomNode:
    """为合同创建自定义节点"""
    node = ContractTimelineCustomNode(
        contract_id=contract_id,
        label=data["label"],
        date_value=data.get("date_value"),
        sort_order=data.get("sort_order", 0),
        icon_type=data.get("icon_type", "plus"),
    )
    db.add(node)
    await db.flush()
    await db.refresh(node)
    return node


async def delete_contract_custom_node(db: AsyncSession, node_id: int) -> bool:
    """删除合同自定义节点"""
    stmt = select(ContractTimelineCustomNode).where(
        ContractTimelineCustomNode.id == node_id
    )
    result = await db.execute(stmt)
    node = result.scalar_one_or_none()
    if not node:
        return False

    await db.delete(node)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  种子数据
# ══════════════════════════════════════════════════════════════════════

async def seed_default_timeline_template(db: AsyncSession) -> Optional[TimelineTemplate]:
    """如果没有任何模板，创建默认「标准流程」模板（含7个节点）"""
    # 检查是否已存在模板
    stmt = select(TimelineTemplate).limit(1)
    result = await db.execute(stmt)
    if result.scalar_one_or_none() is not None:
        return None

    template = TimelineTemplate(
        name="标准流程",
        description="合同标准流程时间轴",
        is_active=True,
    )
    db.add(template)
    await db.flush()

    default_nodes = [
        {"label": "RAT需求", "sort_order": 0, "date_source": None, "active_statuses": [], "icon_type": "file-text"},
        {"label": "项目流程", "sort_order": 1, "date_source": None, "active_statuses": [], "icon_type": "git-branch"},
        {"label": "非项目审议流程", "sort_order": 2, "date_source": None, "active_statuses": [], "icon_type": "clipboard-check"},
        {"label": "请示审批流程", "sort_order": 3, "date_source": None, "active_statuses": [], "icon_type": "file-check"},
        {"label": "采购需求上报", "sort_order": 4, "date_source": None, "active_statuses": [], "icon_type": "shopping-cart"},
        {"label": "续约流程", "sort_order": 5, "date_source": None, "active_statuses": [], "icon_type": "refresh-cw"},
        {"label": "费控流程", "sort_order": 6, "date_source": None, "active_statuses": [], "icon_type": "dollar-sign"},
    ]
    for nd in default_nodes:
        db.add(TimelineNode(
            template_id=template.id,
            label=nd["label"],
            sort_order=nd["sort_order"],
            date_source=nd["date_source"],
            active_statuses=nd["active_statuses"],
            icon_type=nd["icon_type"],
            is_required=True,
            description=None,
        ))

    await db.flush()
    await db.refresh(template, ["nodes"])
    return template
