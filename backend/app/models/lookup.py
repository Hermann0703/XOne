"""通用字典表模型 — LookupDict"""

from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as SAUUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey

from app.core.database import Base
from app.models.base import TimestampMixin


class LookupDict(TimestampMixin, Base):
    """通用字典表 — 管理各类 code->name 映射"""

    __tablename__ = "lookup_dicts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[UUID] = mapped_column(SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True, comment="用户ID")
    category: Mapped[str] = mapped_column(String(32), nullable=False, comment="分类: security_level/retention_period/rating")
    code: Mapped[str] = mapped_column(String(64), nullable=False, comment="编码")
    name: Mapped[str] = mapped_column(String(64), nullable=False, comment="名称")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="是否启用")

    __table_args__ = (
        UniqueConstraint("user_id", "category", "code", name="uq_lookup_dicts_user_category_code"),
    )
