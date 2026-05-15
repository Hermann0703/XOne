from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as SAUUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"

    id: Mapped[UUID] = mapped_column(SAUUID(as_uuid=True), primary_key=True, default=uuid4, comment="供应商ID")
    user_id: Mapped[UUID] = mapped_column(SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, comment="用户ID")

    # ── 供应商信息 ──
    name: Mapped[str] = mapped_column(String(256), nullable=False, comment="企业名称")
    short_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, comment="企业简称")
    english_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, comment="英文名称")
    legal_person: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, comment="法人")
    unified_social_credit_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, comment="统一社会信用代码")
    taxpayer_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, comment="纳税人标识")

    # ── 经营范围 ──
    business_scope: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="经营范围")

    # ── 地址 ──
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True, comment="地址")

    # ── 资质（向后兼容旧字段） ──
    business_license: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, comment="营业执照号(旧)")
    tax_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, comment="税号(旧)")

    # ── 联系人列表（JSON） ──
    # 每项: { name, title, phone, landline, email }
    contacts: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, comment="联系人列表")

    # ── 银行账户列表（JSON） ──
    # 每项: { account_type, account_number, bank_name }
    bank_accounts: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, comment="银行账户列表")

    # ── 旧银行字段（向后兼容） ──
    contact_person: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, comment="联系人(旧)")
    contact_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, comment="联系电话(旧)")
    bank_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, comment="开户行(旧)")
    bank_account: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, comment="银行账号(旧)")
    dc_bank_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, comment="数字人民币开户行(旧)")
    dc_bank_account: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, comment="数字人民币账号(旧)")

    # ── 评级与状态 ──
    rating: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, comment="评级")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", comment="状态")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="备注")
