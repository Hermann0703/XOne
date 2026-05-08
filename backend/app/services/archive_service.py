"""档案管理模块服务层 — 档案/借阅/鉴定/文件 CRUD + 仪表盘"""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import select, func, or_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.archive import Archive, BorrowRecord, AppraisalRecord, ArchiveFile


# ═══════════════════════════════════════════════════════════════════
# 档案 CRUD
# ═══════════════════════════════════════════════════════════════════

async def list_archives(
    db: AsyncSession,
    user_id: int,
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    status: Optional[int] = None,
    fonds_id: Optional[int] = None,
    category_id: Optional[int] = None,
    security_level: Optional[str] = None,
) -> dict:
    """分页查询档案列表，支持多条件筛选。"""
    query = select(Archive).where(Archive.user_id == user_id)
    count_query = select(func.count(Archive.id)).where(Archive.user_id == user_id)

    if status is not None:
        query = query.where(Archive.status == status)
        count_query = count_query.where(Archive.status == status)

    if fonds_id is not None:
        query = query.where(Archive.fonds_id == fonds_id)
        count_query = count_query.where(Archive.fonds_id == fonds_id)

    if category_id is not None:
        query = query.where(Archive.category_id == category_id)
        count_query = count_query.where(Archive.category_id == category_id)

    if security_level:
        query = query.where(Archive.security_level == security_level)
        count_query = count_query.where(Archive.security_level == security_level)

    if search:
        search_filter = or_(
            Archive.title.ilike(f"%{search}%"),
            Archive.archive_no.ilike(f"%{search}%"),
            Archive.keywords.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(Archive.created_at.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def create_archive(db: AsyncSession, user_id: int, data: dict) -> Archive:
    """创建新档案。"""
    archive = Archive(user_id=user_id, **data)
    db.add(archive)
    await db.flush()
    await db.refresh(archive)
    return archive


async def get_archive(db: AsyncSession, archive_id: int, user_id: int) -> Optional[Archive]:
    """获取单个档案详情。"""
    result = await db.execute(
        select(Archive).where(Archive.id == archive_id, Archive.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_archive(
    db: AsyncSession, archive_id: int, user_id: int, data: dict
) -> Optional[Archive]:
    """更新档案信息。"""
    result = await db.execute(
        select(Archive).where(Archive.id == archive_id, Archive.user_id == user_id)
    )
    archive = result.scalar_one_or_none()
    if not archive:
        return None

    for key, value in data.items():
        if hasattr(archive, key) and value is not None:
            setattr(archive, key, value)

    await db.flush()
    await db.refresh(archive)
    return archive


async def delete_archive(db: AsyncSession, archive_id: int, user_id: int) -> bool:
    """删除档案（级联删除借阅记录、鉴定记录、档案文件）。"""
    result = await db.execute(
        select(Archive).where(Archive.id == archive_id, Archive.user_id == user_id)
    )
    archive = result.scalar_one_or_none()
    if not archive:
        return False

    await db.delete(archive)
    await db.flush()
    return True


# ═══════════════════════════════════════════════════════════════════
# 借阅记录 CRUD
# ═══════════════════════════════════════════════════════════════════

async def list_borrows(
    db: AsyncSession,
    user_id: int,
    page: int = 1,
    size: int = 20,
    archive_id: Optional[int] = None,
    status: Optional[str] = None,
) -> dict:
    """分页查询借阅记录。通过 archive.user_id 关联校验用户权限。"""
    query = (
        select(BorrowRecord)
        .join(Archive, BorrowRecord.archive_id == Archive.id)
        .where(Archive.user_id == user_id)
    )
    count_query = (
        select(func.count(BorrowRecord.id))
        .join(Archive, BorrowRecord.archive_id == Archive.id)
        .where(Archive.user_id == user_id)
    )

    if archive_id is not None:
        query = query.where(BorrowRecord.archive_id == archive_id)
        count_query = count_query.where(BorrowRecord.archive_id == archive_id)

    if status:
        query = query.where(BorrowRecord.status == status)
        count_query = count_query.where(BorrowRecord.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(BorrowRecord.borrow_date.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def create_borrow(db: AsyncSession, user_id: int, data: dict) -> Optional[BorrowRecord]:
    """创建借阅记录，并将对应档案状态改为已借出(2)。"""
    # 先验证档案属于该用户
    archive_result = await db.execute(
        select(Archive).where(Archive.id == data["archive_id"], Archive.user_id == user_id)
    )
    archive = archive_result.scalar_one_or_none()
    if not archive:
        return None

    # 若档案已借出则拒绝
    if archive.status == 2:
        return None

    borrow = BorrowRecord(**data)
    db.add(borrow)

    # 更新档案状态为已借出
    archive.status = 2

    await db.flush()
    await db.refresh(borrow)
    return borrow


async def update_borrow(
    db: AsyncSession, borrow_id: int, user_id: int, data: dict
) -> Optional[BorrowRecord]:
    """更新借阅记录。"""
    result = await db.execute(
        select(BorrowRecord)
        .join(Archive, BorrowRecord.archive_id == Archive.id)
        .where(BorrowRecord.id == borrow_id, Archive.user_id == user_id)
    )
    borrow = result.scalar_one_or_none()
    if not borrow:
        return None

    for key, value in data.items():
        if hasattr(borrow, key) and value is not None:
            setattr(borrow, key, value)

    await db.flush()
    await db.refresh(borrow)
    return borrow


async def return_borrow(db: AsyncSession, borrow_id: int, user_id: int) -> Optional[dict]:
    """归还档案：更新借阅记录状态为 returned，设置实际归还日期，恢复档案状态为已归档(1)。"""
    result = await db.execute(
        select(BorrowRecord)
        .join(Archive, BorrowRecord.archive_id == Archive.id)
        .where(BorrowRecord.id == borrow_id, Archive.user_id == user_id)
    )
    borrow = result.scalar_one_or_none()
    if not borrow:
        return None

    if borrow.status == "returned":
        return None  # 已归还，不可重复操作

    borrow.status = "returned"
    borrow.actual_return_date = date.today()

    # 恢复档案状态
    archive_result = await db.execute(
        select(Archive).where(Archive.id == borrow.archive_id)
    )
    archive = archive_result.scalar_one()
    archive.status = 1  # 已归档

    await db.flush()
    await db.refresh(borrow)
    return {"borrow": borrow, "archive": archive}


# ═══════════════════════════════════════════════════════════════════
# 鉴定记录 CRUD
# ═══════════════════════════════════════════════════════════════════

async def list_appraisals(
    db: AsyncSession,
    user_id: int,
    page: int = 1,
    size: int = 20,
    archive_id: Optional[int] = None,
) -> dict:
    """分页查询鉴定记录。"""
    query = (
        select(AppraisalRecord)
        .join(Archive, AppraisalRecord.archive_id == Archive.id)
        .where(Archive.user_id == user_id)
    )
    count_query = (
        select(func.count(AppraisalRecord.id))
        .join(Archive, AppraisalRecord.archive_id == Archive.id)
        .where(Archive.user_id == user_id)
    )

    if archive_id is not None:
        query = query.where(AppraisalRecord.archive_id == archive_id)
        count_query = count_query.where(AppraisalRecord.archive_id == archive_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(AppraisalRecord.appraisal_date.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def create_appraisal(db: AsyncSession, user_id: int, data: dict) -> Optional[AppraisalRecord]:
    """创建鉴定记录。"""
    archive_result = await db.execute(
        select(Archive).where(Archive.id == data["archive_id"], Archive.user_id == user_id)
    )
    archive = archive_result.scalar_one_or_none()
    if not archive:
        return None

    appraisal = AppraisalRecord(**data)
    db.add(appraisal)
    await db.flush()
    await db.refresh(appraisal)
    return appraisal


async def update_appraisal(
    db: AsyncSession, appraisal_id: int, user_id: int, data: dict
) -> Optional[AppraisalRecord]:
    """更新鉴定记录。"""
    result = await db.execute(
        select(AppraisalRecord)
        .join(Archive, AppraisalRecord.archive_id == Archive.id)
        .where(AppraisalRecord.id == appraisal_id, Archive.user_id == user_id)
    )
    appraisal = result.scalar_one_or_none()
    if not appraisal:
        return None

    for key, value in data.items():
        if hasattr(appraisal, key) and value is not None:
            setattr(appraisal, key, value)

    await db.flush()
    await db.refresh(appraisal)
    return appraisal


async def delete_appraisal(db: AsyncSession, appraisal_id: int, user_id: int) -> bool:
    """删除鉴定记录。"""
    result = await db.execute(
        select(AppraisalRecord)
        .join(Archive, AppraisalRecord.archive_id == Archive.id)
        .where(AppraisalRecord.id == appraisal_id, Archive.user_id == user_id)
    )
    appraisal = result.scalar_one_or_none()
    if not appraisal:
        return False

    await db.delete(appraisal)
    await db.flush()
    return True


# ═══════════════════════════════════════════════════════════════════
# 档案文件 CRUD
# ═══════════════════════════════════════════════════════════════════

async def list_archive_files(
    db: AsyncSession,
    user_id: int,
    archive_id: int,
) -> list:
    """获取某个档案的所有文件。"""
    # 验证档案属于该用户
    archive_result = await db.execute(
        select(Archive).where(Archive.id == archive_id, Archive.user_id == user_id)
    )
    if not archive_result.scalar_one_or_none():
        return []

    result = await db.execute(
        select(ArchiveFile)
        .where(ArchiveFile.archive_id == archive_id)
        .order_by(ArchiveFile.upload_date.desc())
    )
    return result.scalars().all()


async def create_archive_file(
    db: AsyncSession, user_id: int, data: dict
) -> Optional[ArchiveFile]:
    """为档案添加文件。"""
    archive_result = await db.execute(
        select(Archive).where(Archive.id == data["archive_id"], Archive.user_id == user_id)
    )
    if not archive_result.scalar_one_or_none():
        return None

    archive_file = ArchiveFile(**data)
    db.add(archive_file)
    await db.flush()
    await db.refresh(archive_file)
    return archive_file


async def delete_archive_file(db: AsyncSession, file_id: int, user_id: int) -> bool:
    """删除档案文件。"""
    result = await db.execute(
        select(ArchiveFile)
        .join(Archive, ArchiveFile.archive_id == Archive.id)
        .where(ArchiveFile.id == file_id, Archive.user_id == user_id)
    )
    archive_file = result.scalar_one_or_none()
    if not archive_file:
        return False

    await db.delete(archive_file)
    await db.flush()
    return True


# ═══════════════════════════════════════════════════════════════════
# 仪表盘
# ═══════════════════════════════════════════════════════════════════

async def get_dashboard(db: AsyncSession, user_id: int) -> dict:
    """档案仪表盘：总数、按状态/密级分布、本月借阅数、逾期未还数、最近操作。"""
    # 档案总数
    total_result = await db.execute(
        select(func.count(Archive.id)).where(Archive.user_id == user_id)
    )
    total_archives = total_result.scalar() or 0

    # 按状态分布
    status_result = await db.execute(
        select(Archive.status, func.count(Archive.id))
        .where(Archive.user_id == user_id)
        .group_by(Archive.status)
    )
    status_map = {0: "草稿", 1: "已归档", 2: "已借出", 3: "已销毁"}
    status_distribution = {
        status_map.get(row[0], f"未知({row[0]})"): row[1]
        for row in status_result.all()
    }

    # 按密级分布
    security_result = await db.execute(
        select(Archive.security_level, func.count(Archive.id))
        .where(Archive.user_id == user_id)
        .group_by(Archive.security_level)
    )
    security_distribution = {row[0]: row[1] for row in security_result.all()}

    # 本月借阅数
    today = date.today()
    month_start = today.replace(day=1)
    borrow_month_result = await db.execute(
        select(func.count(BorrowRecord.id))
        .join(Archive, BorrowRecord.archive_id == Archive.id)
        .where(
            Archive.user_id == user_id,
            BorrowRecord.borrow_date >= month_start,
        )
    )
    monthly_borrows = borrow_month_result.scalar() or 0

    # 逾期未还数
    overdue_result = await db.execute(
        select(func.count(BorrowRecord.id))
        .join(Archive, BorrowRecord.archive_id == Archive.id)
        .where(
            Archive.user_id == user_id,
            BorrowRecord.status == "borrowing",
            BorrowRecord.expected_return_date < today,
        )
    )
    overdue_count = overdue_result.scalar() or 0

    # 最近操作（最近10条创建的档案）
    recent_result = await db.execute(
        select(Archive)
        .where(Archive.user_id == user_id)
        .order_by(Archive.updated_at.desc())
        .limit(10)
    )
    recent_archives = recent_result.scalars().all()

    return {
        "total_archives": total_archives,
        "status_distribution": status_distribution,
        "security_distribution": security_distribution,
        "monthly_borrows": monthly_borrows,
        "overdue_count": overdue_count,
        "recent_archives": recent_archives,
    }
