"""项目管理模块 SQLAlchemy 模型 — 项目 / 看板列 / 任务 / 里程碑"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Text, DateTime, Integer, Index, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as SAUUID, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class Project(TimestampMixin, Base):
    """项目 — 顶层项目管理实体"""

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        SAUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="项目ID"
    )
    name: Mapped[str] = mapped_column(String(256), nullable=False, comment="项目名称")
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="项目描述"
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="active",
        comment="项目状态: active/completed/archived"
    )
    start_date: Mapped[Optional[date]] = mapped_column(
        DateTime, nullable=True, comment="开始日期"
    )
    end_date: Mapped[Optional[date]] = mapped_column(
        DateTime, nullable=True, comment="结束日期"
    )
    user_id: Mapped[UUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True, comment="用户ID"
    )

    __table_args__ = (
        Index("ix_projects_user_status", "user_id", "status"),
        Index("ix_projects_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id!r}, name={self.name!r}, status={self.status!r})>"


class ProjectColumn(TimestampMixin, Base):
    """看板列 — 每个项目下的 Kanban 列"""

    __tablename__ = "project_columns"

    id: Mapped[uuid.UUID] = mapped_column(
        SAUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="列ID"
    )
    project_id: Mapped[UUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False, index=True, comment="所属项目ID"
    )
    title: Mapped[str] = mapped_column(String(128), nullable=False, comment="列标题")
    order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="排序序号"
    )

    __table_args__ = (
        Index("ix_pc_project_order", "project_id", "order"),
    )

    def __repr__(self) -> str:
        return f"<ProjectColumn(id={self.id!r}, title={self.title!r}, order={self.order})>"


class ProjectTask(TimestampMixin, Base):
    """看板任务 — 列下的卡片任务"""

    __tablename__ = "project_tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        SAUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="任务ID"
    )
    column_id: Mapped[UUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("project_columns.id", ondelete="CASCADE"),
        nullable=False, index=True, comment="所属列ID"
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False, comment="任务标题")
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="任务描述"
    )
    assignee: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True, comment="负责人"
    )
    priority: Mapped[str] = mapped_column(
        String(16), nullable=False, default="medium",
        comment="优先级: low/medium/high/urgent"
    )
    due_date: Mapped[Optional[date]] = mapped_column(
        DateTime, nullable=True, comment="截止日期"
    )
    start_date: Mapped[Optional[date]] = mapped_column(
        DateTime, nullable=True, comment="开始日期"
    )
    order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="排序序号"
    )
    tags: Mapped[Optional[str]] = mapped_column(
        String(1024), nullable=True, comment="标签（JSON数组字符串）"
    )

    __table_args__ = (
        Index("ix_pt_column_order", "column_id", "order"),
        Index("ix_pt_column_priority", "column_id", "priority"),
    )

    def __repr__(self) -> str:
        return f"<ProjectTask(id={self.id!r}, title={self.title!r}, priority={self.priority!r})>"


class ProjectMilestone(TimestampMixin, Base):
    """项目里程碑 — 项目级关键节点"""

    __tablename__ = "project_milestones"

    id: Mapped[uuid.UUID] = mapped_column(
        SAUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="里程碑ID"
    )
    project_id: Mapped[UUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False, index=True, comment="所属项目ID"
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False, comment="里程碑标题")
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="里程碑描述"
    )
    due_date: Mapped[Optional[date]] = mapped_column(
        DateTime, nullable=True, comment="截止日期"
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending",
        comment="状态: pending/in_progress/completed"
    )
    progress: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="进度百分比 0-100"
    )

    __table_args__ = (
        Index("ix_pm_project_due", "project_id", "due_date"),
        Index("ix_pm_project_status", "project_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<ProjectMilestone(id={self.id!r}, title={self.title!r}, progress={self.progress})>"
