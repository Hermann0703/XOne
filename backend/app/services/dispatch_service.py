"""数据报送管理模块服务层 — 数据源/任务 CRUD + 执行引擎 + 监控"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dispatch import DispatchDataSource, DispatchTask, DispatchLog


# ═══════════════════════════════════════════════════════════════════
# 数据源 CRUD
# ═══════════════════════════════════════════════════════════════════

async def list_data_sources(
    db: AsyncSession,
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    source_type: Optional[str] = None,
) -> dict:
    """分页查询数据源列表。"""
    query = select(DispatchDataSource)
    count_query = select(func.count(DispatchDataSource.id))

    if search:
        search_filter = DispatchDataSource.name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if status:
        query = query.where(DispatchDataSource.status == status)
        count_query = count_query.where(DispatchDataSource.status == status)

    if source_type:
        query = query.where(DispatchDataSource.source_type == source_type)
        count_query = count_query.where(DispatchDataSource.source_type == source_type)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(DispatchDataSource.created_at.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def get_data_source(db: AsyncSession, source_id: str) -> Optional[DispatchDataSource]:
    """获取单个数据源详情。"""
    result = await db.execute(
        select(DispatchDataSource).where(DispatchDataSource.id == source_id)
    )
    return result.scalar_one_or_none()


async def create_data_source(db: AsyncSession, data: dict) -> DispatchDataSource:
    """创建数据源。"""
    source = DispatchDataSource(**data)
    db.add(source)
    await db.flush()
    await db.refresh(source)
    return source


async def update_data_source(
    db: AsyncSession, source_id: str, data: dict
) -> Optional[DispatchDataSource]:
    """更新数据源信息。"""
    result = await db.execute(
        select(DispatchDataSource).where(DispatchDataSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        return None

    for key, value in data.items():
        if hasattr(source, key) and value is not None:
            setattr(source, key, value)

    await db.flush()
    await db.refresh(source)
    return source


async def delete_data_source(db: AsyncSession, source_id: str) -> bool:
    """删除数据源（级联删除所有关联任务）。"""
    result = await db.execute(
        select(DispatchDataSource).where(DispatchDataSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        return False

    await db.delete(source)
    await db.flush()
    return True


# ═══════════════════════════════════════════════════════════════════
# 任务 CRUD
# ═══════════════════════════════════════════════════════════════════

async def list_tasks(
    db: AsyncSession,
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    data_source_id: Optional[str] = None,
) -> dict:
    """分页查询任务列表。"""
    query = select(DispatchTask)
    count_query = select(func.count(DispatchTask.id))

    if search:
        search_filter = DispatchTask.name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if status:
        query = query.where(DispatchTask.status == status)
        count_query = count_query.where(DispatchTask.status == status)

    if data_source_id is not None:
        query = query.where(DispatchTask.data_source_id == data_source_id)
        count_query = count_query.where(DispatchTask.data_source_id == data_source_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(DispatchTask.created_at.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def get_task(db: AsyncSession, task_id: str) -> Optional[DispatchTask]:
    """获取单个任务详情。"""
    result = await db.execute(
        select(DispatchTask).where(DispatchTask.id == task_id)
    )
    return result.scalar_one_or_none()


async def create_task(db: AsyncSession, data: dict) -> Optional[DispatchTask]:
    """创建任务。先验证所属数据源是否存在。"""
    ds_id = str(data["data_source_id"]) if not isinstance(data["data_source_id"], str) else data["data_source_id"]
    source_result = await db.execute(
        select(DispatchDataSource).where(
            DispatchDataSource.id == ds_id
        )
    )
    if not source_result.scalar_one_or_none():
        return None

    task = DispatchTask(**data)
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


async def update_task(
    db: AsyncSession, task_id: str, data: dict
) -> Optional[DispatchTask]:
    """更新任务信息。"""
    result = await db.execute(
        select(DispatchTask).where(DispatchTask.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        return None

    for key, value in data.items():
        if hasattr(task, key) and value is not None:
            setattr(task, key, value)

    await db.flush()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task_id: str) -> bool:
    """删除任务。"""
    result = await db.execute(
        select(DispatchTask).where(DispatchTask.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        return False

    await db.delete(task)
    await db.flush()
    return True


# ═══════════════════════════════════════════════════════════════════
# 执行引擎
# ═══════════════════════════════════════════════════════════════════

async def execute_task(db: AsyncSession, task_id: str) -> Optional[DispatchLog]:
    """执行单个报送任务：更新状态 → 执行查询/API → 写日志 → 更新状态。"""
    # 获取任务
    task_result = await db.execute(
        select(DispatchTask).where(DispatchTask.id == task_id)
    )
    task = task_result.scalar_one_or_none()
    if not task:
        return None

    # 获取数据源
    source_result = await db.execute(
        select(DispatchDataSource).where(DispatchDataSource.id == task.data_source_id)
    )
    data_source = source_result.scalar_one_or_none()
    if not data_source:
        return None

    # 更新任务状态为 running
    now = datetime.now(timezone.utc)
    task.status = "running"
    task.last_run_at = now
    await db.flush()

    # 创建执行日志（预写入）
    log = DispatchLog(
        task_id=task.id,
        status="failed",
        rows_count=0,
        started_at=now,
    )
    db.add(log)
    await db.flush()

    # 执行数据报送
    rows_count = 0
    error_message = None

    try:
        if data_source.source_type == "api" and task.endpoint_url:
            rows_count = await _execute_api_dispatch(task, data_source)
        elif data_source.source_type == "database" and task.query_sql:
            rows_count = await _execute_db_dispatch(task, data_source)
        else:
            # file / manual 类型：简单记录
            rows_count = 0

        log.status = "success"
        log.rows_count = rows_count
        task.status = "success"

    except Exception as exc:
        error_message = str(exc)
        log.status = "failed"
        log.error_message = error_message
        task.status = "failed"

    # 更新日志完成信息
    finished_at = datetime.now(timezone.utc)
    log.finished_at = finished_at
    log.duration_ms = int((finished_at - log.started_at).total_seconds() * 1000)

    # 更新任务状态
    task.status = "success" if log.status == "success" else "failed"
    task.last_run_at = now
    await db.flush()
    await db.refresh(log)

    return log


async def _execute_api_dispatch(task: DispatchTask, data_source: DispatchDataSource) -> int:
    """通过 HTTP API 执行数据报送。"""
    params = task.params or {}
    url = task.endpoint_url

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url, params=params) if params else await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    # 返回数据行数
    if isinstance(data, list):
        return len(data)
    if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
        return len(data["data"])
    return 1 if data else 0


async def _execute_db_dispatch(task: DispatchTask, data_source: DispatchDataSource) -> int:
    """通过数据库查询执行数据报送（当前使用任务自身配置的 query_sql）。"""
    # 注：在实际生产场景中，这里应当根据 connection_config 建立到目标数据库的连接，
    # 执行 task.query_sql 并将结果写入 task.target_table。
    # 当前简化实现仅记录任务已执行。
    return 0


# ═══════════════════════════════════════════════════════════════════
# 执行日志
# ═══════════════════════════════════════════════════════════════════

async def list_logs(
    db: AsyncSession,
    page: int = 1,
    size: int = 20,
    task_id: Optional[str] = None,
) -> dict:
    """分页查询执行日志（按时间倒序）。"""
    query = select(DispatchLog)
    count_query = select(func.count(DispatchLog.id))

    if task_id is not None:
        query = query.where(DispatchLog.task_id == task_id)
        count_query = count_query.where(DispatchLog.task_id == task_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    query = query.order_by(DispatchLog.started_at.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {"items": items, "total": total}


# ═══════════════════════════════════════════════════════════════════
# 监控面板
# ═══════════════════════════════════════════════════════════════════

async def get_monitoring_data(db: AsyncSession) -> dict:
    """获取近 7 天执行统计（每天成功/失败数、总行数、平均耗时）。"""
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    # 查询近 7 天的日志
    result = await db.execute(
        select(DispatchLog).where(DispatchLog.started_at >= seven_days_ago)
    )
    logs = result.scalars().all()

    # 按日期汇总
    daily_stats: dict = {}
    for log in logs:
        date_key = log.started_at.strftime("%Y-%m-%d")
        if date_key not in daily_stats:
            daily_stats[date_key] = {
                "date": date_key,
                "success_count": 0,
                "failed_count": 0,
                "total_rows": 0,
                "total_duration_ms": 0,
                "execution_count": 0,
            }
        stats = daily_stats[date_key]
        stats["execution_count"] += 1
        if log.status == "success":
            stats["success_count"] += 1
        else:
            stats["failed_count"] += 1
        stats["total_rows"] += log.rows_count or 0
        stats["total_duration_ms"] += log.duration_ms or 0

    # 补全 7 天空白日期
    result_list = []
    for i in range(7):
        date = (now - timedelta(days=6 - i)).strftime("%Y-%m-%d")
        if date in daily_stats:
            stats = daily_stats[date]
            stats["avg_duration_ms"] = (
                round(stats["total_duration_ms"] / stats["execution_count"], 2)
                if stats["execution_count"] > 0
                else 0
            )
            result_list.append(stats)
        else:
            result_list.append({
                "date": date,
                "success_count": 0,
                "failed_count": 0,
                "total_rows": 0,
                "avg_duration_ms": 0,
                "execution_count": 0,
            })

    return {"daily": result_list}


async def get_overview(db: AsyncSession) -> dict:
    """仪表盘概览：活跃数据源数 + 活跃任务数 + 今日执行数 + 今日成功率。"""
    # 活跃数据源数
    active_source_result = await db.execute(
        select(func.count(DispatchDataSource.id)).where(
            DispatchDataSource.status == "active"
        )
    )
    active_sources = active_source_result.scalar() or 0

    # 活跃任务数
    active_task_result = await db.execute(
        select(func.count(DispatchTask.id)).where(
            DispatchTask.status.in_(["pending", "running"])
        )
    )
    active_tasks = active_task_result.scalar() or 0

    # 今日执行统计
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = await db.execute(
        select(DispatchLog).where(DispatchLog.started_at >= today_start)
    )
    today_logs = today_result.scalars().all()

    today_execution_count = len(today_logs)
    today_success_count = sum(1 for l in today_logs if l.status == "success")
    today_success_rate = (
        round(today_success_count / today_execution_count * 100, 2)
        if today_execution_count > 0
        else 0
    )

    return {
        "active_sources": active_sources,
        "active_tasks": active_tasks,
        "today_execution_count": today_execution_count,
        "today_success_rate": today_success_rate,
    }
