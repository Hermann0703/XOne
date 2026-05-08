"""合同管理模块 SQLAlchemy 模型 — 全宗/分类/密级/合同/里程碑"""

from datetime import date
from typing import Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Date, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Fonds(TimestampMixin, Base):
    """全宗 — 合同档案分类顶层"""

    __tablename__ = "fonds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, comment="全宗名称")
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, comment="全宗代码")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="描述")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")

    categories: Mapped[list["Category"]] = relationship(
        "Category", back_populates="fonds", lazy="selectin",
        foreign_keys="Category.fonds_id"
    )

    def __repr__(self) -> str:
        return f"<Fonds(id={self.id}, name={self.name!r}, code={self.code!r})>"


class Category(TimestampMixin, Base):
    """分类 — 全宗下的二级分类，支持树形结构"""

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, comment="分类名称")
    code: Mapped[str] = mapped_column(String(64), nullable=False, comment="分类代码")
    fonds_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("fonds.id", ondelete="CASCADE"), nullable=False, index=True, comment="所属全宗ID"
    )
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True, comment="父分类ID"
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="描述")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")

    fonds: Mapped["Fonds"] = relationship("Fonds", back_populates="categories", foreign_keys=[fonds_id])
    parent: Mapped[Optional["Category"]] = relationship(
        "Category", remote_side=[id], back_populates="children", foreign_keys=[parent_id]
    )
    children: Mapped[list["Category"]] = relationship(
        "Category", back_populates="parent", lazy="selectin", foreign_keys=[parent_id]
    )

    __table_args__ = (
        Index("ix_categories_fonds_code", "fonds_id", "code"),
    )

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name={self.name!r}, code={self.code!r}, fonds_id={self.fonds_id})>"


class Classification(TimestampMixin, Base):
    """密级 — 合同保密等级"""

    __tablename__ = "classifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False, comment="密级名称")
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, comment="密级代码")
    level: Mapped[int] = mapped_column(Integer, nullable=False, comment="密级等级 1-5")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="描述")
    color: Mapped[Optional[str]] = mapped_column(String(16), nullable=True, comment="显示颜色")

    def __repr__(self) -> str:
        return f"<Classification(id={self.id}, name={self.name!r}, level={self.level})>"


class Contract(TimestampMixin, Base):
    """合同"""

    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True, comment="用户ID")
    contract_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, comment="合同编号")
    title: Mapped[str] = mapped_column(String(256), nullable=False, comment="合同标题")
    fonds_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("fonds.id", ondelete="RESTRICT"), nullable=False, index=True, comment="所属全宗ID"
    )
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True, comment="所属分类ID"
    )
    classification_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("classifications.id", ondelete="RESTRICT"), nullable=False, comment="密级ID"
    )
    party_a: Mapped[str] = mapped_column(String(256), nullable=False, comment="甲方")
    party_b: Mapped[str] = mapped_column(String(256), nullable=False, comment="乙方")
    amount: Mapped[float] = mapped_column(Float, nullable=False, comment="合同金额")
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="CNY", comment="币种")
    sign_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="签订日期")
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="开始日期")
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="结束日期")
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="draft",
        comment="状态: draft/signed/in_progress/completed/terminated"
    )
    contract_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="other",
        comment="合同类型: purchase/service/lease/loan/other"
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="描述")
    keywords: Mapped[Optional[str]] = mapped_column(String(512), nullable=True, comment="关键词")

    # ORM 关联
    fonds: Mapped["Fonds"] = relationship("Fonds", foreign_keys=[fonds_id])
    category: Mapped["Category"] = relationship("Category", foreign_keys=[category_id])
    classification: Mapped["Classification"] = relationship("Classification", foreign_keys=[classification_id])
    milestones: Mapped[list["Milestone"]] = relationship(
        "Milestone", back_populates="contract", lazy="selectin", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_contracts_user_status", "user_id", "status"),
        Index("ix_contracts_user_type", "user_id", "contract_type"),
    )

    def __repr__(self) -> str:
        return (
            f"<Contract(id={self.id}, contract_no={self.contract_no!r}, "
            f"title={self.title!r}, status={self.status!r})>"
        )


class Milestone(TimestampMixin, Base):
    """里程碑 — 合同关键节点"""

    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True, comment="所属合同ID"
    )
    name: Mapped[str] = mapped_column(String(256), nullable=False, comment="里程碑名称")
    amount: Mapped[float] = mapped_column(Float, nullable=False, default=0, comment="里程碑金额")
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="计划日期")
    completed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="完成日期")
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="pending",
        comment="状态: pending/completed/overdue"
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="描述")

    contract: Mapped["Contract"] = relationship("Contract", back_populates="milestones")

    __table_args__ = (
        Index("ix_milestones_contract_status", "contract_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<Milestone(id={self.id}, contract_id={self.contract_id}, "
            f"name={self.name!r}, status={self.status!r})>"
        )
