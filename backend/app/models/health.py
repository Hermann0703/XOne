"""健康模块 SQLAlchemy 模型 — 饮食记录 / 运动记录 / 身体指标"""

from datetime import date
from typing import Optional

from sqlalchemy import String, Float, Integer, Date, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class FoodRecord(Base, TimestampMixin):
    """饮食记录"""

    __tablename__ = "food_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    food_name: Mapped[str] = mapped_column(String(128), nullable=False, comment="食物名称")
    calories: Mapped[float] = mapped_column(Float, nullable=False, comment="热量(千卡)")
    protein: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, comment="蛋白质(克)")
    carbs: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, comment="碳水化合物(克)")
    fat: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, comment="脂肪(克)")
    meal_type: Mapped[str] = mapped_column(
        String(16), nullable=False, comment="餐别: breakfast/lunch/dinner/snack"
    )
    record_date: Mapped[date] = mapped_column(Date, nullable=False, index=True, comment="记录日期")
    serving_size: Mapped[str] = mapped_column(String(32), nullable=False, default="份", comment="份量")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="备注")

    def __repr__(self) -> str:
        return (
            f"<FoodRecord(id={self.id}, user={self.user_id}, "
            f"food='{self.food_name}', calories={self.calories}, "
            f"date={self.record_date}, meal={self.meal_type})>"
        )


class ExerciseRecord(Base, TimestampMixin):
    """运动记录"""

    __tablename__ = "exercise_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    exercise_name: Mapped[str] = mapped_column(String(128), nullable=False, comment="运动名称")
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, comment="时长(分钟)")
    calories_burned: Mapped[float] = mapped_column(Float, nullable=False, comment="消耗热量(千卡)")
    exercise_type: Mapped[str] = mapped_column(String(32), nullable=False, comment="运动类型")
    record_date: Mapped[date] = mapped_column(Date, nullable=False, index=True, comment="记录日期")
    intensity: Mapped[str] = mapped_column(
        String(16), nullable=False, default="medium", comment="强度: low/medium/high"
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="备注")

    def __repr__(self) -> str:
        return (
            f"<ExerciseRecord(id={self.id}, user={self.user_id}, "
            f"exercise='{self.exercise_name}', duration={self.duration_minutes}min, "
            f"calories_burned={self.calories_burned}, date={self.record_date})>"
        )


class BodyMetrics(Base, TimestampMixin):
    """身体指标"""

    __tablename__ = "body_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="体重(kg)")
    height: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="身高(cm)")
    bmi: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="BMI")
    body_fat: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="体脂率(%)")
    waist: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="腰围(cm)")
    record_date: Mapped[date] = mapped_column(Date, nullable=False, index=True, comment="记录日期")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="备注")

    def __repr__(self) -> str:
        return (
            f"<BodyMetrics(id={self.id}, user={self.user_id}, "
            f"weight={self.weight}, bmi={self.bmi}, date={self.record_date})>"
        )
