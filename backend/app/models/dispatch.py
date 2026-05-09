"""数据报送管理模块数据模型 — 数据源/报送任务/执行日志"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Text, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import TimestampMixin


class DispatchDataSource(Base, TimestampMixin):
    """数据源模型"""

    __tablename__ = "dispatch_data_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    source_type: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="database/api/file/manual"
    )
    connection_config: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(
        String(20), default="active", comment="active/inactive/error"
    )
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    tasks: Mapped[list["DispatchTask"]] = relationship(
        "DispatchTask", back_populates="data_source", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<DispatchDataSource(id={self.id}, name='{self.name}', type='{self.source_type}')>"


class DispatchTask(Base, TimestampMixin):
    """报送任务模型"""

    __tablename__ = "dispatch_tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    data_source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("dispatch_data_sources.id"), nullable=False, index=True
    )
    schedule: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="crontab 表达式"
    )
    target_table: Mapped[str] = mapped_column(String(200), nullable=False)
    query_sql: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    endpoint_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    params: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="pending/running/success/failed"
    )
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    next_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)

    data_source: Mapped["DispatchDataSource"] = relationship(
        "DispatchDataSource", back_populates="tasks"
    )
    logs: Mapped[list["DispatchLog"]] = relationship(
        "DispatchLog", back_populates="task", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<DispatchTask(id={self.id}, name='{self.name}', status='{self.status}')>"


class DispatchLog(Base):
    """执行日志模型"""

    __tablename__ = "dispatch_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("dispatch_tasks.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="success/failed"
    )
    rows_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    task: Mapped["DispatchTask"] = relationship("DispatchTask", back_populates="logs")

    def __repr__(self) -> str:
        return f"<DispatchLog(id={self.id}, task_id={self.task_id}, status='{self.status}')>"
