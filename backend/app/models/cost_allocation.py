"""费用分摊模块 — 合同费用分摊到部门"""

from decimal import Decimal
from typing import Optional

from sqlalchemy import ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class CostAllocation(TimestampMixin, Base):
    """合同费用分摊 — 将合同金额分摊到各部门"""

    __tablename__ = "cost_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False, index=True, comment="所属合同ID"
    )
    department_id: Mapped[str] = mapped_column(
        String(16), ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False, index=True, comment="部门ID"
    )
    amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True, comment="分摊金额"
    )

    # ORM 关联
    department: Mapped["Department"] = relationship("Department", lazy="joined")
    contract: Mapped["Contract"] = relationship("Contract", back_populates="cost_allocations")

    __table_args__ = (
        UniqueConstraint("contract_id", "department_id", name="uq_contract_dept"),
    )

    def __repr__(self) -> str:
        return (
            f"<CostAllocation(id={self.id}, contract_id={self.contract_id}, "
            f"department_id={self.department_id!r}, amount={self.amount})>"
        )
