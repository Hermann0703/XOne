"""资产模块 SQLAlchemy 模型 — 账户(Account) 与 交易(Transaction)"""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Date, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Account(TimestampMixin, Base):
    """资产账户"""

    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(
        String(32), nullable=False, comment="bank/cash/credit/investment/other"
    )
    balance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="CNY")
    institution: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # 反向关联
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="account", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<Account(id={self.id}, user_id={self.user_id}, name={self.name!r}, "
            f"type={self.type!r}, balance={self.balance})>"
        )


class Transaction(TimestampMixin, Base):
    """交易记录"""

    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(16), nullable=False, comment="income/expense/transfer"
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="food/transport/shopping/entertainment/housing/health/education/investment/salary/other",
    )
    description: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 转账目标账户（仅 transfer 类型时使用）
    target_account_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )

    # ORM 关联
    account: Mapped["Account"] = relationship("Account", back_populates="transactions", foreign_keys=[account_id])

    def __repr__(self) -> str:
        return (
            f"<Transaction(id={self.id}, user_id={self.user_id}, type={self.type!r}, "
            f"amount={self.amount}, category={self.category!r}, "
            f"transaction_date={self.transaction_date})>"
        )
