"""健康模块 FastAPI 路由 — 饮食 / 运动 / 身体指标 / 仪表盘"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services import health_service as svc

router = APIRouter()


# ──────────────────────────────────────────────
#  饮食记录
# ──────────────────────────────────────────────

@router.get("/foods")
async def list_foods(
    user_id: int = Query(..., description="用户ID"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页条数"),
    meal_type: Optional[str] = Query(None, description="餐别: breakfast/lunch/dinner/snack"),
    date_from: Optional[date] = Query(None, description="开始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
    db: AsyncSession = Depends(get_db),
):
    """查询饮食记录列表"""
    result = await svc.list_foods(
        db, user_id, page=page, size=size,
        meal_type=meal_type, date_from=date_from, date_to=date_to,
    )
    return {
        "data": result["items"],
        "paging": {"total": result["total"], "page": page, "size": size},
        "message": "查询成功",
    }


@router.post("/foods", status_code=201)
async def create_food(
    data: dict,
    user_id: int = Query(..., description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """创建一条饮食记录"""
    record = await svc.create_food(db, user_id, data)
    return {
        "data": svc.row_to_dict(record),
        "message": "创建成功",
    }


# ──────────────────────────────────────────────
#  运动记录
# ──────────────────────────────────────────────

@router.get("/exercises")
async def list_exercises(
    user_id: int = Query(..., description="用户ID"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页条数"),
    exercise_type: Optional[str] = Query(None, description="运动类型"),
    date_from: Optional[date] = Query(None, description="开始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
    db: AsyncSession = Depends(get_db),
):
    """查询运动记录列表"""
    result = await svc.list_exercises(
        db, user_id, page=page, size=size,
        exercise_type=exercise_type, date_from=date_from, date_to=date_to,
    )
    return {
        "data": result["items"],
        "paging": {"total": result["total"], "page": page, "size": size},
        "message": "查询成功",
    }


@router.post("/exercises", status_code=201)
async def create_exercise(
    data: dict,
    user_id: int = Query(..., description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """创建一条运动记录"""
    record = await svc.create_exercise(db, user_id, data)
    return {
        "data": svc.row_to_dict(record),
        "message": "创建成功",
    }


# ──────────────────────────────────────────────
#  身体指标
# ──────────────────────────────────────────────

@router.get("/metrics")
async def list_metrics(
    user_id: int = Query(..., description="用户ID"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页条数"),
    date_from: Optional[date] = Query(None, description="开始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
    db: AsyncSession = Depends(get_db),
):
    """查询身体指标记录列表"""
    result = await svc.list_metrics(
        db, user_id, page=page, size=size,
        date_from=date_from, date_to=date_to,
    )
    return {
        "data": result["items"],
        "paging": {"total": result["total"], "page": page, "size": size},
        "message": "查询成功",
    }


@router.post("/metrics", status_code=201)
async def create_metric(
    data: dict,
    user_id: int = Query(..., description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """创建一条身体指标记录"""
    record = await svc.create_metric(db, user_id, data)
    return {
        "data": svc.row_to_dict(record),
        "message": "创建成功",
    }


# ──────────────────────────────────────────────
#  仪表盘
# ──────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard(
    user_id: int = Query(..., description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """健康仪表盘聚合数据"""
    data = await svc.get_dashboard(db, user_id)
    return {
        "data": data,
        "message": "查询成功",
    }
