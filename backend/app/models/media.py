"""观影模块数据模型 — 影视管理"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Integer, Date, Text, ForeignKey, UUID as SAUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class Movie(Base, TimestampMixin):
    """影视记录模型"""

    __tablename__ = "movies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[UUID] = mapped_column(SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    title_en: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    director: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    genre: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    poster_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    tmdb_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    douban_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="want_to_watch"
    )
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    watch_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    my_review: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    def __repr__(self) -> str:
        return f"<Movie(id={self.id}, title='{self.title}', status='{self.status}')>"
