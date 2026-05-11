"""项目管理模块 API — 项目 / 看板列 / 任务 / 里程碑"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project, ProjectColumn, ProjectTask, ProjectMilestone
from app.models.user import User
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["工作-项目管理"])


# ── Pydantic Schemas ──────────────────────────────────────────────────


class ProjectCreate(BaseModel):
    """创建项目请求体"""
    name: str = Field(..., min_length=1, max_length=256, description="项目名称")
    description: Optional[str] = Field(default=None, description="项目描述")
    status: str = Field(default="active", description="项目状态: active/completed/archived")
    start_date: Optional[date] = Field(default=None, description="开始日期")
    end_date: Optional[date] = Field(default=None, description="结束日期")


class ProjectUpdate(BaseModel):
    """更新项目请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=256, description="项目名称")
    description: Optional[str] = Field(default=None, description="项目描述")
    status: Optional[str] = Field(default=None, description="项目状态")
    start_date: Optional[date] = Field(default=None, description="开始日期")
    end_date: Optional[date] = Field(default=None, description="结束日期")


class ColumnCreate(BaseModel):
    """创建看板列请求体"""
    title: str = Field(..., min_length=1, max_length=128, description="列标题")
    order: Optional[int] = Field(default=None, description="排序序号")


class ColumnUpdate(BaseModel):
    """更新看板列请求体"""
    title: Optional[str] = Field(default=None, min_length=1, max_length=128, description="列标题")
    order: Optional[int] = Field(default=None, description="排序序号")


class ColumnReorder(BaseModel):
    """列排序请求体"""
    ordered_ids: list[UUID] = Field(..., min_length=1, description="按新顺序排列的列ID列表")


class TaskCreate(BaseModel):
    """创建任务请求体"""
    column_id: UUID = Field(..., description="所属列ID")
    title: str = Field(..., min_length=1, max_length=512, description="任务标题")
    description: Optional[str] = Field(default=None, description="任务描述")
    assignee: Optional[str] = Field(default=None, max_length=128, description="负责人")
    priority: str = Field(default="medium", description="优先级: low/medium/high/urgent")
    due_date: Optional[date] = Field(default=None, description="截止日期")
    start_date: Optional[date] = Field(default=None, description="开始日期")
    order: Optional[int] = Field(default=None, description="排序序号")
    tags: Optional[str] = Field(default=None, max_length=1024, description="标签（JSON数组字符串）")


class TaskUpdate(BaseModel):
    """更新任务请求体"""
    title: Optional[str] = Field(default=None, min_length=1, max_length=512, description="任务标题")
    description: Optional[str] = Field(default=None, description="任务描述")
    assignee: Optional[str] = Field(default=None, max_length=128, description="负责人")
    priority: Optional[str] = Field(default=None, description="优先级")
    due_date: Optional[date] = Field(default=None, description="截止日期")
    start_date: Optional[date] = Field(default=None, description="开始日期")
    order: Optional[int] = Field(default=None, description="排序序号")
    tags: Optional[str] = Field(default=None, max_length=1024, description="标签（JSON数组字符串）")


class TaskMove(BaseModel):
    """移动任务请求体"""
    target_column_id: UUID = Field(..., description="目标列ID")
    target_order: int = Field(..., ge=0, description="目标排序位置")


class MilestoneCreate(BaseModel):
    """创建里程碑请求体"""
    title: str = Field(..., min_length=1, max_length=256, description="里程碑标题")
    description: Optional[str] = Field(default=None, description="里程碑描述")
    due_date: Optional[date] = Field(default=None, description="截止日期")
    status: str = Field(default="pending", description="状态: pending/in_progress/completed")
    progress: int = Field(default=0, ge=0, le=100, description="进度百分比 0-100")


class MilestoneUpdate(BaseModel):
    """更新里程碑请求体"""
    title: Optional[str] = Field(default=None, min_length=1, max_length=256, description="里程碑标题")
    description: Optional[str] = Field(default=None, description="里程碑描述")
    due_date: Optional[date] = Field(default=None, description="截止日期")
    status: Optional[str] = Field(default=None, description="状态")
    progress: Optional[int] = Field(default=None, ge=0, le=100, description="进度百分比")


# ── 辅助序列化函数 ────────────────────────────────────────────────────


def _project_to_dict(p) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "description": p.description,
        "status": p.status,
        "start_date": p.start_date.isoformat() if p.start_date else None,
        "end_date": p.end_date.isoformat() if p.end_date else None,
        "user_id": str(p.user_id),
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _column_to_dict(c) -> dict:
    return {
        "id": str(c.id),
        "project_id": str(c.project_id),
        "title": c.title,
        "order": c.order,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _task_to_dict(t) -> dict:
    return {
        "id": str(t.id),
        "column_id": str(t.column_id),
        "title": t.title,
        "description": t.description,
        "assignee": t.assignee,
        "priority": t.priority,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "start_date": t.start_date.isoformat() if t.start_date else None,
        "order": t.order,
        "tags": t.tags,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _milestone_to_dict(m) -> dict:
    return {
        "id": str(m.id),
        "project_id": str(m.project_id),
        "title": m.title,
        "description": m.description,
        "due_date": m.due_date.isoformat() if m.due_date else None,
        "status": m.status,
        "progress": m.progress,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  项目 (Project) 端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("", summary="获取项目列表")
async def get_project_list(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的所有项目"""
    items = await project_service.list_projects(db, current_user.id)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_project_to_dict(p) for p in items],
    }


@router.post("", summary="创建项目")
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新项目（自动创建待办/进行中/已完成三个默认列）"""
    project = await project_service.create_project(
        db, body.model_dump(), current_user.id
    )
    return {
        "code": 0,
        "message": "项目创建成功",
        "data": _project_to_dict(project),
    }


@router.get("/{project_id}", summary="获取项目详情")
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取单个项目详情"""
    project = await project_service.get_project(db, str(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问该项目")
    return {
        "code": 0,
        "message": "查询成功",
        "data": _project_to_dict(project),
    }


@router.put("/{project_id}", summary="更新项目")
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新项目信息"""
    project = await project_service.get_project(db, str(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改该项目")

    updated = await project_service.update_project(
        db, str(project_id), body.model_dump(exclude_none=True)
    )
    return {
        "code": 0,
        "message": "项目更新成功",
        "data": _project_to_dict(updated),
    }


@router.delete("/{project_id}", summary="删除项目")
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除项目（级联删除列、任务、里程碑）"""
    project = await project_service.get_project(db, str(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除该项目")

    success = await project_service.delete_project(db, str(project_id))
    if not success:
        raise HTTPException(status_code=404, detail="项目不存在")
    return {
        "code": 0,
        "message": "项目删除成功",
        "data": None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  看板列 (ProjectColumn) 端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/{project_id}/columns", summary="获取项目看板列")
async def get_column_list(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取项目的所有看板列"""
    project = await project_service.get_project(db, str(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问该项目")

    items = await project_service.list_columns(db, str(project_id))
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_column_to_dict(c) for c in items],
    }


@router.post("/{project_id}/columns", summary="创建看板列")
async def create_column(
    project_id: UUID,
    body: ColumnCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """在项目中创建新的看板列"""
    project = await project_service.get_project(db, str(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作该项目")

    column = await project_service.create_column(db, str(project_id), body.model_dump())
    return {
        "code": 0,
        "message": "看板列创建成功",
        "data": _column_to_dict(column),
    }


@router.put("/columns/{column_id}", summary="更新看板列")
async def update_column(
    column_id: UUID,
    body: ColumnUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新看板列信息"""
    col = await db.get(ProjectColumn, column_id)
    if not col:
        raise HTTPException(status_code=404, detail="看板列不存在")
    project = await db.get(Project, col.project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")

    column = await project_service.update_column(db, str(column_id), body.model_dump(exclude_none=True))
    if not column:
        raise HTTPException(status_code=404, detail="看板列不存在")
    return {
        "code": 0,
        "message": "看板列更新成功",
        "data": _column_to_dict(column),
    }


@router.delete("/columns/{column_id}", summary="删除看板列")
async def delete_column(
    column_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除看板列（级联删除任务）"""
    col = await db.get(ProjectColumn, column_id)
    if not col:
        raise HTTPException(status_code=404, detail="看板列不存在")
    project = await db.get(Project, col.project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")

    success = await project_service.delete_column(db, str(column_id))
    if not success:
        raise HTTPException(status_code=404, detail="看板列不存在")
    return {
        "code": 0,
        "message": "看板列删除成功",
        "data": None,
    }


@router.patch("/{project_id}/columns/reorder", summary="重新排序列")
async def reorder_columns(
    project_id: UUID,
    body: ColumnReorder,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """批量调整看板列顺序"""
    project = await project_service.get_project(db, str(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作该项目")

    success = await project_service.reorder_columns(db, str(project_id), body.ordered_ids)
    if not success:
        raise HTTPException(status_code=400, detail="列ID列表与项目实际列不匹配")
    return {
        "code": 0,
        "message": "列排序更新成功",
        "data": None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  任务 (ProjectTask) 端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/{project_id}/tasks", summary="获取项目任务列表")
async def get_task_list(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取项目下的所有任务（跨列）"""
    project = await project_service.get_project(db, str(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问该项目")

    items = await project_service.list_tasks_by_project(db, str(project_id))
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_task_to_dict(t) for t in items],
    }


@router.post("/tasks", summary="创建任务")
async def create_task(
    body: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新的看板任务"""
    data = body.model_dump()
    task = await project_service.create_task(db, data)
    return {
        "code": 0,
        "message": "任务创建成功",
        "data": _task_to_dict(task),
    }


@router.put("/tasks/{task_id}", summary="更新任务")
async def update_task(
    task_id: UUID,
    body: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新任务信息"""
    # 验证所有权
    task_check = await db.get(ProjectTask, task_id)
    if not task_check:
        raise HTTPException(status_code=404, detail="任务不存在")
    column = await db.get(ProjectColumn, task_check.column_id)
    if not column:
        raise HTTPException(status_code=404, detail="任务所属列不存在")
    project = await db.get(Project, column.project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")

    data = body.model_dump(exclude_none=True)
    task = await project_service.update_task(db, str(task_id), data)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {
        "code": 0,
        "message": "任务更新成功",
        "data": _task_to_dict(task),
    }


@router.delete("/tasks/{task_id}", summary="删除任务")
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除任务"""
    # 验证所有权
    task_check = await db.get(ProjectTask, task_id)
    if not task_check:
        raise HTTPException(status_code=404, detail="任务不存在")
    column = await db.get(ProjectColumn, task_check.column_id)
    if not column:
        raise HTTPException(status_code=404, detail="任务所属列不存在")
    project = await db.get(Project, column.project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")

    success = await project_service.delete_task(db, str(task_id))
    if not success:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {
        "code": 0,
        "message": "任务删除成功",
        "data": None,
    }


@router.patch("/tasks/{task_id}/move", summary="移动任务")
async def move_task(
    task_id: UUID,
    body: TaskMove,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """将任务移动到指定列的目标位置"""
    # 验证所有权
    task_check = await db.get(ProjectTask, task_id)
    if not task_check:
        raise HTTPException(status_code=404, detail="任务不存在")
    column = await db.get(ProjectColumn, task_check.column_id)
    if not column:
        raise HTTPException(status_code=404, detail="任务所属列不存在")
    project = await db.get(Project, column.project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")

    task = await project_service.move_task(db, str(task_id), body.target_column_id, body.target_order)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {
        "code": 0,
        "message": "任务移动成功",
        "data": _task_to_dict(task),
    }


# ═══════════════════════════════════════════════════════════════════════
#  里程碑 (ProjectMilestone) 端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/{project_id}/milestones", summary="获取项目里程碑")
async def get_milestone_list(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取项目的所有里程碑"""
    project = await project_service.get_project(db, str(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问该项目")

    items = await project_service.list_milestones(db, str(project_id))
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_milestone_to_dict(m) for m in items],
    }


@router.post("/{project_id}/milestones", summary="创建里程碑")
async def create_milestone(
    project_id: UUID,
    body: MilestoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """为项目创建新的里程碑"""
    project = await project_service.get_project(db, str(project_id))
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作该项目")

    data = body.model_dump()
    data["project_id"] = project_id  # 使用路径参数
    milestone = await project_service.create_milestone(db, data)
    return {
        "code": 0,
        "message": "里程碑创建成功",
        "data": _milestone_to_dict(milestone),
    }


@router.put("/milestones/{milestone_id}", summary="更新里程碑")
async def update_milestone(
    milestone_id: UUID,
    body: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新里程碑信息"""
    # 验证所有权
    ms = await db.get(ProjectMilestone, milestone_id)
    if not ms:
        raise HTTPException(status_code=404, detail="里程碑不存在")
    project = await db.get(Project, ms.project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")

    milestone = await project_service.update_milestone(
        db, str(milestone_id), body.model_dump(exclude_none=True)
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="里程碑不存在")
    return {
        "code": 0,
        "message": "里程碑更新成功",
        "data": _milestone_to_dict(milestone),
    }


@router.delete("/milestones/{milestone_id}", summary="删除里程碑")
async def delete_milestone(
    milestone_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除里程碑"""
    # 验证所有权
    ms = await db.get(ProjectMilestone, milestone_id)
    if not ms:
        raise HTTPException(status_code=404, detail="里程碑不存在")
    project = await db.get(Project, ms.project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作")

    success = await project_service.delete_milestone(db, str(milestone_id))
    if not success:
        raise HTTPException(status_code=404, detail="里程碑不存在")
    return {
        "code": 0,
        "message": "里程碑删除成功",
        "data": None,
    }
