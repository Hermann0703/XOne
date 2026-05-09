"""档案管理模块数据模型 — 档案/借阅/鉴定/档案文件"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Integer, Date, Text, ForeignKey, UUID as SAUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Archive(Base, TimestampMixin):
    """档案记录模型"""

    __tablename__ = "archives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[UUID] = mapped_column(SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    archive_no: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    fonds_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    category_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    classification_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    box_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    file_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    volume_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    responsible_person: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    doc_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    retention_period: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    security_level: Mapped[str] = mapped_column(
        String(20), nullable=False, default="公开"
    )  # 公开/内部/秘密/机密
    status: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0草稿 1已归档 2已借出 3已销毁
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    keywords: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # 关联
    borrow_records: Mapped[list["BorrowRecord"]] = relationship(
        "BorrowRecord", back_populates="archive", cascade="all, delete-orphan"
    )
    appraisal_records: Mapped[list["AppraisalRecord"]] = relationship(
        "AppraisalRecord", back_populates="archive", cascade="all, delete-orphan"
    )
    files: Mapped[list["ArchiveFile"]] = relationship(
        "ArchiveFile", back_populates="archive", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Archive(id={self.id}, archive_no='{self.archive_no}', title='{self.title}')>"


class BorrowRecord(Base, TimestampMixin):
    """借阅记录模型"""

    __tablename__ = "borrow_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    archive_id: Mapped[int] = mapped_column(Integer, ForeignKey("archives.id"), nullable=False, index=True)
    borrower: Mapped[str] = mapped_column(String(100), nullable=False)
    borrow_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_return_date: Mapped[date] = mapped_column(Date, nullable=False)
    actual_return_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="borrowing")  # borrowing/returned/overdue
    purpose: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    approver: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    archive: Mapped["Archive"] = relationship("Archive", back_populates="borrow_records")

    def __repr__(self) -> str:
        return f"<BorrowRecord(id={self.id}, borrower='{self.borrower}', status='{self.status}')>"


class AppraisalRecord(Base, TimestampMixin):
    """鉴定记录模型"""

    __tablename__ = "appraisal_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    archive_id: Mapped[int] = mapped_column(Integer, ForeignKey("archives.id"), nullable=False, index=True)
    appraisal_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # 到期鉴定/销毁鉴定/价值鉴定
    appraisal_date: Mapped[date] = mapped_column(Date, nullable=False)
    result: Mapped[str] = mapped_column(String(255), nullable=False)
    appraiser: Mapped[str] = mapped_column(String(100), nullable=False)
    suggestion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    archive: Mapped["Archive"] = relationship("Archive", back_populates="appraisal_records")

    def __repr__(self) -> str:
        return f"<AppraisalRecord(id={self.id}, type='{self.appraisal_type}', result='{self.result}')>"


class ArchiveFile(Base, TimestampMixin):
    """档案文件模型"""

    __tablename__ = "archive_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    archive_id: Mapped[int] = mapped_column(Integer, ForeignKey("archives.id"), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    file_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    upload_date: Mapped[date] = mapped_column(Date, nullable=False)

    archive: Mapped["Archive"] = relationship("Archive", back_populates="files")

    def __repr__(self) -> str:
        return f"<ArchiveFile(id={self.id}, file_name='{self.file_name}')>"
