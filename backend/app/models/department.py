"""组织架构模块 — 部门管理"""

from typing import Optional
from uuid import UUID

from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as SAUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class Department(TimestampMixin, Base):
    """部门 — 台账管理中的组织架构"""

    __tablename__ = "departments"

    # 部门ID：纯数字字符串，允许以 0 开头（如 "001", "0123"）
    id: Mapped[str] = mapped_column(
        String(16), primary_key=True,
        comment="部门ID（纯数字字符串，允许首位为0）"
    )
    user_id: Mapped[UUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"),
        nullable=False, index=True, comment="用户ID"
    )
    name: Mapped[str] = mapped_column(
        String(128), nullable=False, comment="部门名称"
    )
    leader: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, comment="负责人"
    )
    business_contact: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, comment="业务对接人"
    )
    it_contact: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, comment="IT对接人"
    )
    remarks: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="备注"
    )

    def __repr__(self) -> str:
        return f"<Department(id={self.id!r}, name={self.name!r})>"
