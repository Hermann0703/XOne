"""物理存储管理模块数据模型 — 档案柜/档案盒"""

from typing import Optional

from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Cabinet(Base, TimestampMixin):
    """档案柜模型"""

    __tablename__ = "cabinets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    floor: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    room: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    boxes: Mapped[list["Box"]] = relationship(
        "Box", back_populates="cabinet", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Cabinet(id={self.id}, name='{self.name}', code='{self.code}')>"


class Box(Base, TimestampMixin):
    """档案盒模型"""

    __tablename__ = "boxes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cabinet_id: Mapped[int] = mapped_column(Integer, ForeignKey("cabinets.id"), nullable=False, index=True)
    box_no: Mapped[str] = mapped_column(String(50), nullable=False)
    row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    col: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    layer: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="empty")  # empty/partial/full
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    cabinet: Mapped["Cabinet"] = relationship("Cabinet", back_populates="boxes")

    def __repr__(self) -> str:
        return f"<Box(id={self.id}, box_no='{self.box_no}', status='{self.status}')>"
