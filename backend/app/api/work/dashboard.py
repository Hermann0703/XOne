"""工作仪表盘聚合 API"""

import asyncio
from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectTask, ProjectColumn
from app.models.contract import Contract
from app.models.archive import BorrowRecord, Archive
from app.models.dispatch import DispatchTask
from app.services import project_service, contract_service, archive_service

router = APIRouter()


# ── 各模块统计收集器 ──────────────────────────────────────────────────


async def _collect_project_stats(db: AsyncSession, user_id: UUID) -> dict:
    """收集项目模块统计数据。"""
    try:
        projects = await project_service.list_projects(db, user_id)
        active_count = sum(1 for p in projects if p.status == "active")
        completed_count = sum(1 for p in projects if p.status == "completed")

        # 并行获取所有项目的任务和列
        async def _fetch_tasks_and_columns(proj: Project):
            tasks = await project_service.list_tasks_by_project(db, proj.id)
            columns = await project_service.list_columns(db, proj.id)
            return tasks, columns

        results = await asyncio.gather(
            *[_fetch_tasks_and_columns(p) for p in projects]
        )

        total_tasks = 0
        overdue_tasks = 0
        today = date.today()

        for tasks, columns in results:
            total_tasks += len(tasks)
            done_column_ids = {c.id for c in columns if c.title == "已完成"}
            for task in tasks:
                if (
                    task.due_date
                    and task.due_date < today
                    and task.column_id not in done_column_ids
                ):
                    overdue_tasks += 1

        return {
            "active_projects": active_count,
            "completed_projects": completed_count,
            "pending_tasks": total_tasks,
            "overdue_tasks": overdue_tasks,
        }
    except Exception:
        return {
            "active_projects": 0,
            "completed_projects": 0,
            "pending_tasks": 0,
            "overdue_tasks": 0,
        }


async def _collect_contract_stats(db: AsyncSession, user_id: UUID) -> dict:
    """收集合同模块统计数据。"""
    try:
        # 使用 service 获取总数
        _, total = await contract_service.list_contracts(
            db, user_id, page=1, page_size=1
        )

        # 直接查询即将到期的合同（30 天内）
        today = date.today()
        upcoming = today + timedelta(days=30)
        expiring_stmt = (
            select(func.count())
            .select_from(Contract)
            .where(
                Contract.user_id == user_id,
                Contract.status.notin_(["terminated", "completed"]),
                Contract.end_date >= today,
                Contract.end_date <= upcoming,
            )
        )
        expiring_result = await db.execute(expiring_stmt)
        expiring = expiring_result.scalar() or 0

        return {"contract_count": total, "expiring_contracts": expiring}
    except Exception:
        return {"contract_count": 0, "expiring_contracts": 0}


async def _collect_archive_stats(db: AsyncSession, user_id: UUID) -> dict:
    """收集档案模块统计数据。"""
    try:
        archive_result = await archive_service.list_archives(
            db, user_id, page=1, size=1
        )
        archive_count = archive_result["total"]

        borrow_result = await archive_service.list_borrows(
            db, user_id, page=1, size=1, status="borrowing"
        )
        pending_borrows = borrow_result["total"]

        return {"archive_count": archive_count, "pending_borrows": pending_borrows}
    except Exception:
        return {"archive_count": 0, "pending_borrows": 0}


async def _collect_dispatch_stats(db: AsyncSession, user_id: UUID) -> dict:
    """收集数据报送模块统计数据。"""
    try:
        # dispatch_service.list_tasks 未按 user_id 过滤，此处直接查询
        total_stmt = (
            select(func.count())
            .select_from(DispatchTask)
            .where(DispatchTask.user_id == user_id)
        )
        total_result = await db.execute(total_stmt)
        dispatch_count = total_result.scalar() or 0

        pending_stmt = (
            select(func.count())
            .select_from(DispatchTask)
            .where(
                DispatchTask.user_id == user_id,
                DispatchTask.status == "pending",
            )
        )
        pending_result = await db.execute(pending_stmt)
        pending_dispatch = pending_result.scalar() or 0

        return {"dispatch_count": dispatch_count, "pending_dispatch": pending_dispatch}
    except Exception:
        return {"dispatch_count": 0, "pending_dispatch": 0}


async def _collect_project_progress(db: AsyncSession, user_id: UUID) -> list:
    """收集活跃项目进度（Top 5）。"""
    try:
        projects = await project_service.list_projects(db, user_id)
        active = [p for p in projects if p.status == "active"]

        # 按 end_date 排序（无截止日期的排最后）
        active.sort(key=lambda p: (p.end_date is None, p.end_date or date.max))
        top5 = active[:5]

        # 并行获取每个项目的任务和列
        async def _calc_progress(proj: Project) -> dict:
            tasks = await project_service.list_tasks_by_project(db, proj.id)
            columns = await project_service.list_columns(db, proj.id)
            total = len(tasks)
            done_ids = {c.id for c in columns if c.title == "已完成"}
            completed = sum(1 for t in tasks if t.column_id in done_ids)
            progress = round(completed / total * 100) if total > 0 else 0

            return {
                "id": str(proj.id),
                "name": proj.name,
                "progress": progress,
                "deadline": proj.end_date.isoformat() if proj.end_date else None,
                "status": proj.status,
            }

        return await asyncio.gather(*[_calc_progress(p) for p in top5])
    except Exception:
        return []


async def _collect_recent_activities(db: AsyncSession, user_id: UUID) -> list:
    """收集最近活动（跨模块聚合，最多 10 条）。"""
    try:
        activities: list = []

        # ── 1. 最近任务更新 ──
        projects = await project_service.list_projects(db, user_id)
        project_ids = [p.id for p in projects]

        if project_ids:
            cols_stmt = select(ProjectColumn.id).where(
                ProjectColumn.project_id.in_(project_ids)
            )
            cols_result = await db.execute(cols_stmt)
            column_ids = [row[0] for row in cols_result.all()]

            if column_ids:
                task_stmt = (
                    select(ProjectTask)
                    .where(ProjectTask.column_id.in_(column_ids))
                    .order_by(ProjectTask.updated_at.desc())
                    .limit(10)
                )
                task_result = await db.execute(task_stmt)
                for task in task_result.scalars().all():
                    activities.append({
                        "id": str(task.id),
                        "action": "更新任务",
                        "target": task.title,
                        "time": task.updated_at.isoformat()
                        if task.updated_at
                        else None,
                        "user": task.assignee or "",
                    })

        # ── 2. 最近合同更新 ──
        contract_stmt = (
            select(Contract)
            .where(Contract.user_id == user_id)
            .order_by(Contract.updated_at.desc())
            .limit(10)
        )
        contract_result = await db.execute(contract_stmt)
        for contract in contract_result.scalars().all():
            activities.append({
                "id": str(contract.id),
                "action": "更新合同",
                "target": contract.title,
                "time": contract.updated_at.isoformat()
                if contract.updated_at
                else None,
                "user": contract.party_a or "",
            })

        # ── 3. 最近借阅申请 ──
        borrow_stmt = (
            select(BorrowRecord, Archive.title)
            .join(Archive, BorrowRecord.archive_id == Archive.id)
            .where(Archive.user_id == user_id)
            .order_by(BorrowRecord.created_at.desc())
            .limit(10)
        )
        borrow_result = await db.execute(borrow_stmt)
        for borrow, archive_title in borrow_result.all():
            activities.append({
                "id": str(borrow.id),
                "action": "申请借阅",
                "target": archive_title or "",
                "time": borrow.created_at.isoformat()
                if borrow.created_at
                else None,
                "user": borrow.borrower or "",
            })

        # 按时间倒序，截断到 10 条
        activities.sort(key=lambda a: a["time"] or "", reverse=True)
        return activities[:10]
    except Exception:
        return []


# ── 仪表盘端点 ────────────────────────────────────────────────────────


@router.get("/dashboard", summary="工作仪表盘聚合数据")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """聚合多模块数据，返回工作仪表盘概览。"""
    user_id = current_user.id

    (
        project_stats,
        contract_stats,
        archive_stats,
        dispatch_stats,
        project_progress,
        recent_activities,
    ) = await asyncio.gather(
        _collect_project_stats(db, user_id),
        _collect_contract_stats(db, user_id),
        _collect_archive_stats(db, user_id),
        _collect_dispatch_stats(db, user_id),
        _collect_project_progress(db, user_id),
        _collect_recent_activities(db, user_id),
    )

    return {
        "code": 0,
        "message": "查询成功",
        "data": {
            "stats": {
                **project_stats,
                **contract_stats,
                **archive_stats,
                **dispatch_stats,
            },
            "project_progress": project_progress,
            "recent_activities": recent_activities,
        },
    }
