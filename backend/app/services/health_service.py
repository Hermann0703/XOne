"""健康模块服务层 — CRUD + 仪表盘聚合"""

from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.health import FoodRecord, ExerciseRecord, BodyMetrics


# ──────────────────────────────────────────────
#  工具函数
# ──────────────────────────────────────────────


def _to_date(val):
    """将字符串转为 date 对象，已是 date 对象则原样返回。"""
    if val is None:
        return None
    if isinstance(val, date):
        return val
    from datetime import datetime as _dt
    if isinstance(val, _dt):
        return val.date()
    return date.fromisoformat(val)


_DATE_FIELDS = frozenset({"record_date", "start_date", "end_date", "created_date", "purchased_date"})


def _convert_date_fields(data: dict) -> dict:
    """将字典中已知日期字段的字符串值转为 date 对象。"""
    for k, v in data.items():
        if k in _DATE_FIELDS and isinstance(v, str):
            data[k] = _to_date(v)
    return data


# ──────────────────────────────────────────────
#  饮食记录 (FoodRecord)
# ──────────────────────────────────────────────

async def list_foods(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    size: int = 20,
    meal_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> dict:
    """分页查询饮食记录"""
    conditions = [FoodRecord.user_id == user_id]
    if meal_type:
        conditions.append(FoodRecord.meal_type == meal_type)
    if date_from:
        conditions.append(FoodRecord.record_date >= date_from)
    if date_to:
        conditions.append(FoodRecord.record_date <= date_to)

    stmt_where = and_(*conditions)

    # 总数
    count_q = select(func.count(FoodRecord.id)).where(stmt_where)
    total = (await db.execute(count_q)).scalar() or 0

    # 分页数据（按日期降序、创建时间降序）
    data_q = (
        select(FoodRecord)
        .where(stmt_where)
        .order_by(desc(FoodRecord.record_date), desc(FoodRecord.created_at))
        .offset((page - 1) * size)
        .limit(size)
    )
    rows = (await db.execute(data_q)).scalars().all()

    return {
        "items": [row_to_dict(r) for r in rows],
        "total": total,
    }


async def create_food(db: AsyncSession, user_id: UUID, data: dict) -> FoodRecord:
    """创建一条饮食记录"""
    data = _convert_date_fields(data)
    record = FoodRecord(
        user_id=user_id,
        food_name=data["food_name"],
        calories=data["calories"],
        protein=data.get("protein", 0.0),
        carbs=data.get("carbs", 0.0),
        fat=data.get("fat", 0.0),
        meal_type=data["meal_type"],
        record_date=data["record_date"],
        serving_size=data.get("serving_size", "份"),
        notes=data.get("notes"),
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def update_food(db: AsyncSession, food_id: int, user_id: UUID, data: dict) -> FoodRecord:
    """更新一条饮食记录 — 仅允许记录所有者操作"""
    result = await db.execute(
        select(FoodRecord).where(FoodRecord.id == food_id, FoodRecord.user_id == user_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        return None

    data = _convert_date_fields(data)
    for key, value in data.items():
        if hasattr(record, key) and key not in ("id", "user_id", "created_at"):
            setattr(record, key, value)

    await db.flush()
    await db.refresh(record)
    return record


async def delete_food(db: AsyncSession, food_id: int, user_id: UUID) -> bool:
    """删除一条饮食记录 — 仅允许记录所有者操作"""
    result = await db.execute(
        select(FoodRecord).where(FoodRecord.id == food_id, FoodRecord.user_id == user_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        return False
    await db.delete(record)
    await db.flush()
    return True


# ──────────────────────────────────────────────
#  运动记录 (ExerciseRecord)
# ──────────────────────────────────────────────

async def list_exercises(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    size: int = 20,
    exercise_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> dict:
    """分页查询运动记录"""
    conditions = [ExerciseRecord.user_id == user_id]
    if exercise_type:
        conditions.append(ExerciseRecord.exercise_type == exercise_type)
    if date_from:
        conditions.append(ExerciseRecord.record_date >= date_from)
    if date_to:
        conditions.append(ExerciseRecord.record_date <= date_to)

    stmt_where = and_(*conditions)

    count_q = select(func.count(ExerciseRecord.id)).where(stmt_where)
    total = (await db.execute(count_q)).scalar() or 0

    data_q = (
        select(ExerciseRecord)
        .where(stmt_where)
        .order_by(desc(ExerciseRecord.record_date), desc(ExerciseRecord.created_at))
        .offset((page - 1) * size)
        .limit(size)
    )
    rows = (await db.execute(data_q)).scalars().all()

    return {
        "items": [row_to_dict(r) for r in rows],
        "total": total,
    }


async def create_exercise(db: AsyncSession, user_id: UUID, data: dict) -> ExerciseRecord:
    """创建一条运动记录"""
    data = _convert_date_fields(data)
    record = ExerciseRecord(
        user_id=user_id,
        exercise_name=data["exercise_name"],
        duration_minutes=data["duration_minutes"],
        calories_burned=data["calories_burned"],
        exercise_type=data["exercise_type"],
        record_date=data["record_date"],
        intensity=data.get("intensity", "medium"),
        notes=data.get("notes"),
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def update_exercise(db: AsyncSession, exercise_id: int, user_id: UUID, data: dict) -> ExerciseRecord:
    """更新一条运动记录 — 仅允许记录所有者操作"""
    result = await db.execute(
        select(ExerciseRecord).where(ExerciseRecord.id == exercise_id, ExerciseRecord.user_id == user_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        return None

    data = _convert_date_fields(data)
    for key, value in data.items():
        if hasattr(record, key) and key not in ("id", "user_id", "created_at"):
            setattr(record, key, value)

    await db.flush()
    await db.refresh(record)
    return record


async def delete_exercise(db: AsyncSession, exercise_id: int, user_id: UUID) -> bool:
    """删除一条运动记录 — 仅允许记录所有者操作"""
    result = await db.execute(
        select(ExerciseRecord).where(ExerciseRecord.id == exercise_id, ExerciseRecord.user_id == user_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        return False
    await db.delete(record)
    await db.flush()
    return True


# ──────────────────────────────────────────────
#  身体指标 (BodyMetrics)
# ──────────────────────────────────────────────

async def list_metrics(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    size: int = 20,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> dict:
    """分页查询身体指标"""
    conditions = [BodyMetrics.user_id == user_id]
    if date_from:
        conditions.append(BodyMetrics.record_date >= date_from)
    if date_to:
        conditions.append(BodyMetrics.record_date <= date_to)

    stmt_where = and_(*conditions)

    count_q = select(func.count(BodyMetrics.id)).where(stmt_where)
    total = (await db.execute(count_q)).scalar() or 0

    data_q = (
        select(BodyMetrics)
        .where(stmt_where)
        .order_by(desc(BodyMetrics.record_date), desc(BodyMetrics.created_at))
        .offset((page - 1) * size)
        .limit(size)
    )
    rows = (await db.execute(data_q)).scalars().all()

    return {
        "items": [row_to_dict(r) for r in rows],
        "total": total,
    }


async def create_metric(db: AsyncSession, user_id: UUID, data: dict) -> BodyMetrics:
    """创建一条身体指标记录"""
    data = _convert_date_fields(data)
    record = BodyMetrics(
        user_id=user_id,
        weight=data.get("weight"),
        height=data.get("height"),
        bmi=data.get("bmi"),
        body_fat=data.get("body_fat"),
        waist=data.get("waist"),
        record_date=data["record_date"],
        notes=data.get("notes"),
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def update_metric(db: AsyncSession, metric_id: int, user_id: UUID, data: dict) -> BodyMetrics:
    """更新一条身体指标记录 — 仅允许记录所有者操作"""
    result = await db.execute(
        select(BodyMetrics).where(BodyMetrics.id == metric_id, BodyMetrics.user_id == user_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        return None

    data = _convert_date_fields(data)
    for key, value in data.items():
        if hasattr(record, key) and key not in ("id", "user_id", "created_at"):
            setattr(record, key, value)

    await db.flush()
    await db.refresh(record)
    return record


async def delete_metric(db: AsyncSession, metric_id: int, user_id: UUID) -> bool:
    """删除一条身体指标记录 — 仅允许记录所有者操作"""
    result = await db.execute(
        select(BodyMetrics).where(BodyMetrics.id == metric_id, BodyMetrics.user_id == user_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        return False
    await db.delete(record)
    await db.flush()
    return True


# ──────────────────────────────────────────────
#  仪表盘聚合
# ──────────────────────────────────────────────

async def get_dashboard(db: AsyncSession, user_id: UUID) -> dict:
    """健康仪表盘聚合数据"""
    today = date.today()
    week_ago = today - timedelta(days=6)

    # 今日摄入
    today_cal_q = (
        select(func.coalesce(func.sum(FoodRecord.calories), 0))
        .where(FoodRecord.user_id == user_id, FoodRecord.record_date == today)
    )
    today_calories_in = (await db.execute(today_cal_q)).scalar() or 0

    # 今日消耗
    today_out_q = (
        select(func.coalesce(func.sum(ExerciseRecord.calories_burned), 0))
        .where(ExerciseRecord.user_id == user_id, ExerciseRecord.record_date == today)
    )
    today_calories_out = (await db.execute(today_out_q)).scalar() or 0

    # 今日运动时长
    today_dur_q = (
        select(func.coalesce(func.sum(ExerciseRecord.duration_minutes), 0))
        .where(ExerciseRecord.user_id == user_id, ExerciseRecord.record_date == today)
    )
    today_exercise_minutes = (await db.execute(today_dur_q)).scalar() or 0

    # 近7天体重趋势
    weight_q = (
        select(BodyMetrics.record_date, BodyMetrics.weight)
        .where(
            BodyMetrics.user_id == user_id,
            BodyMetrics.record_date >= week_ago,
            BodyMetrics.record_date <= today,
            BodyMetrics.weight.isnot(None),
        )
        .order_by(BodyMetrics.record_date.asc())
    )
    weight_rows = (await db.execute(weight_q)).all()
    weight_trend = [
        {"date": str(r.record_date), "weight": r.weight} for r in weight_rows
    ]

    # 本周热量平衡（摄入 - 消耗）
    week_in_q = (
        select(func.coalesce(func.sum(FoodRecord.calories), 0))
        .where(
            FoodRecord.user_id == user_id,
            FoodRecord.record_date >= week_ago,
            FoodRecord.record_date <= today,
        )
    )
    week_in = (await db.execute(week_in_q)).scalar() or 0

    week_out_q = (
        select(func.coalesce(func.sum(ExerciseRecord.calories_burned), 0))
        .where(
            ExerciseRecord.user_id == user_id,
            ExerciseRecord.record_date >= week_ago,
            ExerciseRecord.record_date <= today,
        )
    )
    week_out = (await db.execute(week_out_q)).scalar() or 0

    weekly_calorie_balance = {
        "intake": float(week_in),
        "burned": float(week_out),
        "balance": float(week_in - week_out),
        "start_date": str(week_ago),
        "end_date": str(today),
    }

    # 最近5条饮食记录
    recent_foods_q = (
        select(FoodRecord)
        .where(FoodRecord.user_id == user_id)
        .order_by(desc(FoodRecord.record_date), desc(FoodRecord.created_at))
        .limit(5)
    )
    recent_foods_rows = (await db.execute(recent_foods_q)).scalars().all()
    recent_foods = [row_to_dict(r) for r in recent_foods_rows]

    # 最近5条运动记录
    recent_exercises_q = (
        select(ExerciseRecord)
        .where(ExerciseRecord.user_id == user_id)
        .order_by(desc(ExerciseRecord.record_date), desc(ExerciseRecord.created_at))
        .limit(5)
    )
    recent_exercises_rows = (await db.execute(recent_exercises_q)).scalars().all()
    recent_exercises = [row_to_dict(r) for r in recent_exercises_rows]

    return {
        "today_calories_in": float(today_calories_in),
        "today_calories_out": float(today_calories_out),
        "today_exercise_minutes": int(today_exercise_minutes),
        "weight_trend": weight_trend,
        "weekly_calorie_balance": weekly_calorie_balance,
        "recent_foods": recent_foods,
        "recent_exercises": recent_exercises,
    }


# ──────────────────────────────────────────────
#  工具函数
# ──────────────────────────────────────────────

def row_to_dict(row) -> dict:
    """将 ORM 实例转为普通字典（排除 SQLAlchemy 内部属性）"""
    return {
        c.name: getattr(row, c.name)
        for c in row.__table__.columns
    }
