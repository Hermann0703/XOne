"""健康模块 FastAPI 路由 — 饮食 / 运动 / 身体指标 / 仪表盘"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import health_service as svc

router = APIRouter()


# ──────────────────────────────────────────────
#  饮食记录
# ──────────────────────────────────────────────

@router.get("/foods")
async def list_foods(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页条数"),
    meal_type: Optional[str] = Query(None, description="餐别: breakfast/lunch/dinner/snack"),
    date_from: Optional[date] = Query(None, description="开始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
    db: AsyncSession = Depends(get_db),
):
    """查询饮食记录列表"""
    result = await svc.list_foods(
        db, current_user.id, page=page, size=size,
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建一条饮食记录"""
    record = await svc.create_food(db, current_user.id, data)
    return {
        "data": svc.row_to_dict(record),
        "message": "创建成功",
    }


@router.patch("/foods/{food_id}")
async def update_food(
    food_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新一条饮食记录"""
    record = await svc.update_food(db, food_id, current_user.id, data)
    if record is None:
        raise HTTPException(status_code=404, detail="饮食记录不存在")
    return {
        "data": svc.row_to_dict(record),
        "message": "更新成功",
    }


@router.delete("/foods/{food_id}")
async def delete_food(
    food_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除一条饮食记录"""
    success = await svc.delete_food(db, food_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="饮食记录不存在")
    return {"message": "删除成功"}


# ──────────────────────────────────────────────
#  运动记录
# ──────────────────────────────────────────────

@router.get("/exercises")
async def list_exercises(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页条数"),
    exercise_type: Optional[str] = Query(None, description="运动类型"),
    date_from: Optional[date] = Query(None, description="开始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
    db: AsyncSession = Depends(get_db),
):
    """查询运动记录列表"""
    result = await svc.list_exercises(
        db, current_user.id, page=page, size=size,
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建一条运动记录"""
    record = await svc.create_exercise(db, current_user.id, data)
    return {
        "data": svc.row_to_dict(record),
        "message": "创建成功",
    }


@router.patch("/exercises/{exercise_id}")
async def update_exercise(
    exercise_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新一条运动记录"""
    record = await svc.update_exercise(db, exercise_id, current_user.id, data)
    if record is None:
        raise HTTPException(status_code=404, detail="运动记录不存在")
    return {
        "data": svc.row_to_dict(record),
        "message": "更新成功",
    }


@router.delete("/exercises/{exercise_id}")
async def delete_exercise(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除一条运动记录"""
    success = await svc.delete_exercise(db, exercise_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="运动记录不存在")
    return {"message": "删除成功"}


# ──────────────────────────────────────────────
#  身体指标
# ──────────────────────────────────────────────

@router.get("/metrics")
async def list_metrics(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页条数"),
    date_from: Optional[date] = Query(None, description="开始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
    db: AsyncSession = Depends(get_db),
):
    """查询身体指标记录列表"""
    result = await svc.list_metrics(
        db, current_user.id, page=page, size=size,
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建一条身体指标记录"""
    record = await svc.create_metric(db, current_user.id, data)
    return {
        "data": svc.row_to_dict(record),
        "message": "创建成功",
    }


@router.patch("/metrics/{metric_id}")
async def update_metric(
    metric_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新一条身体指标记录"""
    record = await svc.update_metric(db, metric_id, current_user.id, data)
    if record is None:
        raise HTTPException(status_code=404, detail="身体指标记录不存在")
    return {
        "data": svc.row_to_dict(record),
        "message": "更新成功",
    }


@router.delete("/metrics/{metric_id}")
async def delete_metric(
    metric_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除一条身体指标记录"""
    success = await svc.delete_metric(db, metric_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="身体指标记录不存在")
    return {"message": "删除成功"}


# ──────────────────────────────────────────────
#  仪表盘
# ──────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """健康仪表盘聚合数据"""
    data = await svc.get_dashboard(db, current_user.id)
    return {
        "data": data,
        "message": "查询成功",
    }
