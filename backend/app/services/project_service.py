"""项目管理模块服务层 — 项目 / 看板列 / 任务 / 里程碑 业务逻辑"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectColumn, ProjectTask, ProjectMilestone


# ══════════════════════════════════════════════════════════════════════
#  项目 (Project) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_projects(db: AsyncSession, user_id: str) -> list[Project]:
    """查询当前用户所有项目，按创建时间倒序"""
    stmt = (
        select(Project)
        .where(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_project(db: AsyncSession, project_id: str) -> Optional[Project]:
    """获取单个项目"""
    stmt = select(Project).where(Project.id == project_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_project(db: AsyncSession, data: dict, user_id: str) -> Project:
    """创建项目，事务中同时创建 3 个默认列（待办/进行中/已完成）"""
    project = Project(
        user_id=user_id,
        name=data["name"],
        description=data.get("description"),
        status=data.get("status", "active"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
    )
    db.add(project)
    await db.flush()

    # 创建默认 Kanban 列
    default_columns = [
        ProjectColumn(project_id=project.id, title="待办", order=0),
        ProjectColumn(project_id=project.id, title="进行中", order=1),
        ProjectColumn(project_id=project.id, title="已完成", order=2),
    ]
    for col in default_columns:
        db.add(col)

    await db.flush()
    await db.refresh(project)
    return project


async def update_project(db: AsyncSession, project_id: str, data: dict) -> Optional[Project]:
    """更新项目"""
    stmt = select(Project).where(Project.id == project_id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        return None

    updatable = ("name", "description", "status", "start_date", "end_date")
    for field in updatable:
        if field in data:
            setattr(project, field, data[field])

    await db.flush()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project_id: str) -> bool:
    """删除项目（级联删除列、任务、里程碑）"""
    stmt = select(Project).where(Project.id == project_id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    if not project:
        return False

    await db.delete(project)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  看板列 (ProjectColumn) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_columns(db: AsyncSession, project_id: UUID) -> list[ProjectColumn]:
    """获取项目的所有列，按 order 排序"""
    stmt = (
        select(ProjectColumn)
        .where(ProjectColumn.project_id == project_id)
        .order_by(ProjectColumn.order.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_column(db: AsyncSession, project_id: UUID, data: dict) -> ProjectColumn:
    """创建看板列"""
    # 自动计算 order：当前最大 order + 1
    max_order_stmt = (
        select(ProjectColumn.order)
        .where(ProjectColumn.project_id == project_id)
        .order_by(ProjectColumn.order.desc())
        .limit(1)
    )
    max_result = await db.execute(max_order_stmt)
    max_order = max_result.scalar() or -1

    column = ProjectColumn(
        project_id=project_id,
        title=data["title"],
        order=data.get("order", max_order + 1),
    )
    db.add(column)
    await db.flush()
    await db.refresh(column)
    return column


async def update_column(db: AsyncSession, column_id: UUID, data: dict) -> Optional[ProjectColumn]:
    """更新看板列"""
    stmt = select(ProjectColumn).where(ProjectColumn.id == column_id)
    result = await db.execute(stmt)
    column = result.scalar_one_or_none()
    if not column:
        return None

    for field in ("title", "order"):
        if field in data:
            setattr(column, field, data[field])

    await db.flush()
    await db.refresh(column)
    return column


async def delete_column(db: AsyncSession, column_id: UUID) -> bool:
    """删除看板列（级联删除任务）"""
    stmt = select(ProjectColumn).where(ProjectColumn.id == column_id)
    result = await db.execute(stmt)
    column = result.scalar_one_or_none()
    if not column:
        return False

    await db.delete(column)
    await db.flush()
    return True


async def reorder_columns(db: AsyncSession, project_id: UUID, ordered_ids: list[UUID]) -> bool:
    """批量更新列顺序 — ordered_ids 为按新顺序排列的列 ID 列表"""

    # 获取当前项目的所有列
    stmt = select(ProjectColumn).where(ProjectColumn.project_id == project_id)
    result = await db.execute(stmt)
    columns_map = {col.id: col for col in result.scalars().all()}

    # 验证所有 ID 都属于该项目
    if set(ordered_ids) != set(columns_map.keys()):
        return False

    # 按新顺序更新
    for idx, col_id in enumerate(ordered_ids):
        columns_map[col_id].order = idx

    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  任务 (ProjectTask) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_tasks_by_project(db: AsyncSession, project_id: UUID) -> list[ProjectTask]:
    """获取项目下所有任务（跨所有列）"""
    # 先找到项目下的所有列
    cols_stmt = select(ProjectColumn.id).where(ProjectColumn.project_id == project_id)
    cols_result = await db.execute(cols_stmt)
    column_ids = [row[0] for row in cols_result.all()]

    if not column_ids:
        return []

    stmt = (
        select(ProjectTask)
        .where(ProjectTask.column_id.in_(column_ids))
        .order_by(ProjectTask.order.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_task(db: AsyncSession, data: dict) -> ProjectTask:
    """创建任务"""
    # 自动计算 order
    column_id = data["column_id"]
    max_order_stmt = (
        select(ProjectTask.order)
        .where(ProjectTask.column_id == column_id)
        .order_by(ProjectTask.order.desc())
        .limit(1)
    )
    max_result = await db.execute(max_order_stmt)
    max_order = max_result.scalar() or -1

    task = ProjectTask(
        column_id=column_id,
        title=data["title"],
        description=data.get("description"),
        assignee=data.get("assignee"),
        priority=data.get("priority", "medium"),
        due_date=data.get("due_date"),
        start_date=data.get("start_date"),
        order=data.get("order", max_order + 1),
        tags=data.get("tags"),
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


async def update_task(db: AsyncSession, task_id: UUID, data: dict) -> Optional[ProjectTask]:
    """更新任务"""
    stmt = select(ProjectTask).where(ProjectTask.id == task_id)
    result = await db.execute(stmt)
    task = result.scalar_one_or_none()
    if not task:
        return None

    updatable = (
        "title", "description", "assignee", "priority",
        "due_date", "start_date", "order", "tags",
    )
    for field in updatable:
        if field in data:
            setattr(task, field, data[field])

    await db.flush()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task_id: UUID) -> bool:
    """删除任务"""
    stmt = select(ProjectTask).where(ProjectTask.id == task_id)
    result = await db.execute(stmt)
    task = result.scalar_one_or_none()
    if not task:
        return False

    await db.delete(task)
    await db.flush()
    return True


async def move_task(
    db: AsyncSession, task_id: UUID, target_column_id: UUID, target_order: int
) -> Optional[ProjectTask]:
    """移动任务到目标列的目标位置，事务中更新目标列+源列的任务 order"""
    stmt = select(ProjectTask).where(ProjectTask.id == task_id)
    result = await db.execute(stmt)
    task = result.scalar_one_or_none()
    if not task:
        return None

    old_column_id = task.column_id
    old_order = task.order

    # 更新任务所属列和顺序
    task.column_id = target_column_id
    task.order = target_order

    if old_column_id != target_column_id:
        # 关闭源列的缺口：将 order > old_order 的任务减 1
        gap_stmt = (
            select(ProjectTask)
            .where(
                ProjectTask.column_id == old_column_id,
                ProjectTask.order > old_order,
            )
            .order_by(ProjectTask.order.asc())
        )
        gap_result = await db.execute(gap_stmt)
        for t in gap_result.scalars().all():
            t.order -= 1

        # 在目标列腾出位置：将 order >= target_order 的任务加 1（排除自身）
        room_stmt = (
            select(ProjectTask)
            .where(
                ProjectTask.column_id == target_column_id,
                ProjectTask.order >= target_order,
                ProjectTask.id != task_id,
            )
            .order_by(ProjectTask.order.desc())
        )
        room_result = await db.execute(room_stmt)
        for t in room_result.scalars().all():
            t.order += 1
    else:
        # 同列内移动
        if target_order > old_order:
            shift_stmt = (
                select(ProjectTask)
                .where(
                    ProjectTask.column_id == old_column_id,
                    ProjectTask.order > old_order,
                    ProjectTask.order <= target_order,
                    ProjectTask.id != task_id,
                )
                .order_by(ProjectTask.order.asc())
            )
            shift_result = await db.execute(shift_stmt)
            for t in shift_result.scalars().all():
                t.order -= 1
        elif target_order < old_order:
            shift_stmt = (
                select(ProjectTask)
                .where(
                    ProjectTask.column_id == old_column_id,
                    ProjectTask.order >= target_order,
                    ProjectTask.order < old_order,
                    ProjectTask.id != task_id,
                )
                .order_by(ProjectTask.order.desc())
            )
            shift_result = await db.execute(shift_stmt)
            for t in shift_result.scalars().all():
                t.order += 1

    await db.flush()
    await db.refresh(task)
    return task


# ══════════════════════════════════════════════════════════════════════
#  里程碑 (ProjectMilestone) CRUD
# ══════════════════════════════════════════════════════════════════════

async def list_milestones(db: AsyncSession, project_id: UUID) -> list[ProjectMilestone]:
    """获取项目所有里程碑，按截止日期排序"""
    stmt = (
        select(ProjectMilestone)
        .where(ProjectMilestone.project_id == project_id)
        .order_by(ProjectMilestone.due_date.asc().nulls_last(), ProjectMilestone.created_at.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_milestone(db: AsyncSession, data: dict) -> ProjectMilestone:
    """创建里程碑"""
    milestone = ProjectMilestone(
        project_id=data["project_id"],
        title=data["title"],
        description=data.get("description"),
        due_date=data.get("due_date"),
        status=data.get("status", "pending"),
        progress=data.get("progress", 0),
    )
    db.add(milestone)
    await db.flush()
    await db.refresh(milestone)
    return milestone


async def update_milestone(db: AsyncSession, milestone_id: UUID, data: dict) -> Optional[ProjectMilestone]:
    """更新里程碑"""
    stmt = select(ProjectMilestone).where(ProjectMilestone.id == milestone_id)
    result = await db.execute(stmt)
    milestone = result.scalar_one_or_none()
    if not milestone:
        return None

    updatable = ("title", "description", "due_date", "status", "progress")
    for field in updatable:
        if field in data:
            setattr(milestone, field, data[field])

    await db.flush()
    await db.refresh(milestone)
    return milestone


async def delete_milestone(db: AsyncSession, milestone_id: UUID) -> bool:
    """删除里程碑"""
    stmt = select(ProjectMilestone).where(ProjectMilestone.id == milestone_id)
    result = await db.execute(stmt)
    milestone = result.scalar_one_or_none()
    if not milestone:
        return False

    await db.delete(milestone)
    await db.flush()
    return True
