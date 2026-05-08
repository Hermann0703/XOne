"""购物模块 SQLAlchemy 模型 — 预算(Budget) 与 购物项(ShoppingItem)"""

from datetime import date
from typing import Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Date, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Budget(TimestampMixin, Base):
    """预算"""

    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, comment="预算名称")
    amount: Mapped[float] = mapped_column(Float, nullable=False, comment="预算金额")
    category: Mapped[str] = mapped_column(
        String(64), nullable=False, comment="预算分类"
    )
    period: Mapped[str] = mapped_column(
        String(16), nullable=False, comment="周期: monthly/weekly/yearly"
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False, comment="开始日期")
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="结束日期")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="备注")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="是否启用")

    # 反向关联
    items: Mapped[list["ShoppingItem"]] = relationship(
        "ShoppingItem", back_populates="budget", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<Budget(id={self.id}, user_id={self.user_id}, name={self.name!r}, "
            f"amount={self.amount}, category={self.category!r}, period={self.period!r})>"
        )


class ShoppingItem(TimestampMixin, Base):
    """购物清单项"""

    __tablename__ = "shopping_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False, comment="物品名称")
    category: Mapped[str] = mapped_column(
        String(64), nullable=False, comment="物品分类"
    )
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="预估价格")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1, comment="数量")
    priority: Mapped[str] = mapped_column(
        String(16), nullable=False, default="medium", comment="优先级: low/medium/high"
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="pending", comment="状态: pending/purchased/cancelled"
    )
    store: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, comment="购买商家")
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="商品链接")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="备注")
    budget_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("budgets.id", ondelete="SET NULL"), nullable=True, comment="关联预算ID"
    )
    created_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="创建日期")
    purchased_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="购买日期")

    # ORM 关联
    budget: Mapped[Optional["Budget"]] = relationship(
        "Budget", back_populates="items", foreign_keys=[budget_id]
    )

    def __repr__(self) -> str:
        return (
            f"<ShoppingItem(id={self.id}, user_id={self.user_id}, name={self.name!r}, "
            f"category={self.category!r}, price={self.price}, status={self.status!r})>"
        )
