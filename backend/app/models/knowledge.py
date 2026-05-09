"""知识库模块 SQLAlchemy 模型 — 知识文档 / 知识对话"""

from __future__ import annotations

import uuid
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Text, DateTime, Integer, Index, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as SAUUID, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class KnowledgeDocument(TimestampMixin, Base):
    """知识文档 — 存储上传/导入的知识文档元数据及原文内容"""

    __tablename__ = "knowledge_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        SAUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="文档ID"
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False, comment="文档标题")
    file_type: Mapped[str] = mapped_column(
        String(32), nullable=False,
        comment="文件类型: pdf/docx/txt/md/网页"
    )
    file_path: Mapped[Optional[str]] = mapped_column(
        String(1024), nullable=True, comment="文件/导入路径"
    )
    content: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="原文内容"
    )
    source_url: Mapped[Optional[str]] = mapped_column(
        String(2048), nullable=True, comment="原始URL（网页导入时使用）"
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="processing",
        comment="状态: processing/ready/error"
    )
    chunk_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="分块数量"
    )
    user_id: Mapped[UUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True, comment="用户ID"
    )
    tags: Mapped[Optional[str]] = mapped_column(
        String(1024), nullable=True, comment="标签（JSON数组字符串）"
    )

    __table_args__ = (
        Index("ix_kd_user_status", "user_id", "status"),
        Index("ix_kd_user_file_type", "user_id", "file_type"),
        Index("ix_kd_status", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<KnowledgeDocument(id={self.id!r}, title={self.title!r}, "
            f"status={self.status!r})>"
        )


class KnowledgeConversation(TimestampMixin, Base):
    """知识对话 — 存储RAG问答的完整对话记录"""

    __tablename__ = "knowledge_conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        SAUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="对话ID"
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False, comment="对话标题")
    messages: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=list, comment="完整对话记录（JSON）"
    )
    user_id: Mapped[UUID] = mapped_column(
        SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True, comment="用户ID"
    )

    __table_args__ = (
        Index("ix_kc_user_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<KnowledgeConversation(id={self.id!r}, title={self.title!r})>"
