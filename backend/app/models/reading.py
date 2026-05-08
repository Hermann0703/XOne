"""阅读模块数据模型 — 书籍管理"""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import String, Integer, Date, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class Book(Base, TimestampMixin):
    """书籍记录模型"""

    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    isbn: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    publisher: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    publish_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cover_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    douban_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="want_to_read"
    )
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_pages: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    current_page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    finish_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Book(id={self.id}, title='{self.title}', status='{self.status}')>"
