"""数据报送管理模块 API 路由 — 数据源/任务/日志/监控端点"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import dispatch_service

router = APIRouter(tags=["工作-数据报送"])


# ── Pydantic schemas ──────────────────────────────────────────────


class DataSourceCreate(BaseModel):
    """创建数据源请求体"""
    name: str = Field(..., description="数据源名称")
    source_type: str = Field(..., description="数据源类型: database/api/file/manual")
    connection_config: Optional[dict] = Field(default_factory=dict, description="连接配置(JSON)")
    status: str = Field("active", description="状态: active/inactive/error")


class DataSourceUpdate(BaseModel):
    """更新数据源请求体"""
    name: Optional[str] = Field(None, description="数据源名称")
    source_type: Optional[str] = Field(None, description="数据源类型")
    connection_config: Optional[dict] = Field(None, description="连接配置(JSON)")
    status: Optional[str] = Field(None, description="状态: active/inactive/error")


class TaskCreate(BaseModel):
    """创建任务请求体"""
    name: str = Field(..., description="任务名称")
    data_source_id: str = Field(..., description="所属数据源ID(UUID)")
    schedule: str = Field(..., description="Crontab 调度表达式")
    target_table: str = Field(..., description="目标表名")
    query_sql: Optional[str] = Field(None, description="查询SQL(数据库类型)")
    endpoint_url: Optional[str] = Field(None, description="API端点(API类型)")
    params: Optional[dict] = Field(None, description="请求参数(JSON)")
    status: str = Field("pending", description="状态: pending/running/success/failed")


class TaskUpdate(BaseModel):
    """更新任务请求体"""
    name: Optional[str] = Field(None, description="任务名称")
    schedule: Optional[str] = Field(None, description="Crontab 调度表达式")
    target_table: Optional[str] = Field(None, description="目标表名")
    query_sql: Optional[str] = Field(None, description="查询SQL")
    endpoint_url: Optional[str] = Field(None, description="API端点")
    params: Optional[dict] = Field(None, description="请求参数(JSON)")
    status: Optional[str] = Field(None, description="状态")


# ── 数据源端点 ────────────────────────────────────────────────────


@router.get("/dispatch/sources", summary="获取数据源列表")
async def list_data_sources(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="按名称搜索"),
    status: Optional[str] = Query(None, description="按状态筛选: active/inactive/error"),
    source_type: Optional[str] = Query(None, description="按类型筛选: database/api/file/manual"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询数据源列表"""
    result = await dispatch_service.list_data_sources(
        db=db, page=page, size=size, search=search,
        status=status, source_type=source_type,
    )
    return {"message": "查询成功", "data": result}


@router.post("/dispatch/sources", summary="创建数据源", status_code=201)
async def create_data_source(
    current_user: User = Depends(get_current_user),
    data: DataSourceCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """创建新的数据源"""
    source_data = data.model_dump(exclude_none=True)
    source_data["user_id"] = str(current_user.id)
    source = await dispatch_service.create_data_source(
        db=db, data=source_data,
    )
    return {"message": "创建成功", "data": source}


@router.get("/dispatch/sources/{source_id}", summary="获取数据源详情")
async def get_data_source(
    source_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个数据源的详细信息"""
    try:
        uuid.UUID(source_id)  # validate format only
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的 UUID 格式")
    source = await dispatch_service.get_data_source(db=db, source_id=source_id)
    if not source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return {"message": "查询成功", "data": source}


@router.put("/dispatch/sources/{source_id}", summary="更新数据源")
async def update_data_source(
    source_id: str,
    current_user: User = Depends(get_current_user),
    data: DataSourceUpdate = ...,
    db: AsyncSession = Depends(get_db),
):
    """更新数据源信息"""
    try:
        uuid.UUID(source_id)  # validate format only
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的 UUID 格式")
    source = await dispatch_service.update_data_source(
        db=db, source_id=source_id, data=data.model_dump(exclude_none=True),
    )
    if not source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return {"message": "更新成功", "data": source}


@router.delete("/dispatch/sources/{source_id}", summary="删除数据源")
async def delete_data_source(
    source_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除数据源（级联删除所有关联任务）"""
    try:
        uuid.UUID(source_id)  # validate format only
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的 UUID 格式")
    deleted = await dispatch_service.delete_data_source(db=db, source_id=source_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return {"message": "删除成功"}


# ── 任务端点 ──────────────────────────────────────────────────────


@router.get("/dispatch/tasks", summary="获取任务列表")
async def list_tasks(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="按名称搜索"),
    status: Optional[str] = Query(None, description="按状态筛选: pending/running/success/failed"),
    data_source_id: Optional[str] = Query(None, description="按数据源ID筛选"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询任务列表"""
    ds_id = None
    if data_source_id:
        try:
            uuid.UUID(data_source_id)  # validate format only
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的 data_source_id UUID 格式")

    result = await dispatch_service.list_tasks(
        db=db, page=page, size=size, search=search,
        status=status, data_source_id=data_source_id,
    )
    return {"message": "查询成功", "data": result}


@router.post("/dispatch/tasks", summary="创建任务", status_code=201)
async def create_task(
    current_user: User = Depends(get_current_user),
    data: TaskCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """创建新的报送任务"""
    payload = data.model_dump(exclude_none=True)
    payload["user_id"] = str(current_user.id)
    try:
        uuid.UUID(payload["data_source_id"])  # validate format only
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail="无效的 data_source_id UUID 格式")

    task = await dispatch_service.create_task(db=db, data=payload)
    if not task:
        raise HTTPException(status_code=404, detail="所属数据源不存在")
    return {"message": "创建成功", "data": task}


@router.get("/dispatch/tasks/{task_id}", summary="获取任务详情")
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个任务的详细信息"""
    try:
        uuid.UUID(task_id)  # validate format only
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的 UUID 格式")
    task = await dispatch_service.get_task(db=db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"message": "查询成功", "data": task}


@router.put("/dispatch/tasks/{task_id}", summary="更新任务")
async def update_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    data: TaskUpdate = ...,
    db: AsyncSession = Depends(get_db),
):
    """更新任务信息"""
    try:
        uuid.UUID(task_id)  # validate format only
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的 UUID 格式")
    task = await dispatch_service.update_task(
        db=db, task_id=task_id, data=data.model_dump(exclude_none=True),
    )
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"message": "更新成功", "data": task}


@router.delete("/dispatch/tasks/{task_id}", summary="删除任务")
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除任务"""
    try:
        uuid.UUID(task_id)  # validate format only
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的 UUID 格式")
    deleted = await dispatch_service.delete_task(db=db, task_id=task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"message": "删除成功"}


@router.post("/dispatch/tasks/{task_id}/execute", summary="手动触发执行")
async def execute_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """手动触发某个报送任务的执行"""
    try:
        uuid.UUID(task_id)  # validate format only
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的 UUID 格式")
    log = await dispatch_service.execute_task(db=db, task_id=task_id)
    if not log:
        raise HTTPException(status_code=404, detail="任务不存在或数据源不可用")
    return {
        "message": "执行完成" if log.status == "success" else "执行失败",
        "data": log,
    }


# ── 执行日志 ──────────────────────────────────────────────────────


@router.get("/dispatch/logs", summary="获取执行日志")
async def list_logs(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    task_id: Optional[str] = Query(None, description="按任务ID筛选"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询执行日志（按时间倒序）"""
    uid = None
    if task_id:
        try:
            uuid.UUID(task_id)  # validate format only
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的 task_id UUID 格式")

    result = await dispatch_service.list_logs(
        db=db, page=page, size=size, task_id=task_id,
    )
    return {"message": "查询成功", "data": result}


# ── 监控面板 ──────────────────────────────────────────────────────


@router.get("/dispatch/monitoring", summary="监控面板数据")
async def get_monitoring(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取近7天执行统计数据"""
    result = await dispatch_service.get_monitoring_data(db=db)
    return {"message": "查询成功", "data": result}


@router.get("/dispatch/overview", summary="仪表盘概览")
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取仪表盘概览数据（活跃数据源数+活跃任务数+今日执行数+今日成功率）"""
    result = await dispatch_service.get_overview(db=db)
    return {"message": "查询成功", "data": result}
