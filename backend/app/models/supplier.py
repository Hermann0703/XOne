from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(256), nullable=False, comment="供应商名称")
    contact_person: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, comment="联系人")
    contact_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, comment="联系电话")
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True, comment="地址")
    business_license: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, comment="营业执照号")
    tax_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, comment="税号")
    bank_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, comment="开户行")
    bank_account: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, comment="银行账号")
    rating: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, comment="评级")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", comment="状态")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="备注")
