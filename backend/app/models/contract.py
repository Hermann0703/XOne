"""合同管理模块 SQLAlchemy 模型 — 全宗/分类/密级/合同/里程碑"""

from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Date, Text, Index, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID as SAUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.supplier import Supplier

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
    user_id: Mapped[UUID] = mapped_column(SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True, comment="用户ID")
    contract_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, comment="合同编号")
    contract_name: Mapped[str] = mapped_column(String(256), nullable=False, comment="合同名称")
    fonds_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("fonds.id", ondelete="RESTRICT"), nullable=False, index=True, comment="所属全宗ID"
    )
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True, comment="所属分类ID"
    )
    classification_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("classifications.id", ondelete="RESTRICT"), nullable=False, comment="密级ID"
    )
    supplier_id: Mapped[Optional[UUID]] = mapped_column(SAUUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, comment="供应商ID")
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
        comment="合同类型: purchase/service/lease/loan/other (deprecated → contract_type_id)"
    )
    contract_type_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("contract_types.id", ondelete="SET NULL"),
        nullable=True, index=True, comment="合同类型ID (FK → contract_types)"
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="描述")
    keywords: Mapped[Optional[str]] = mapped_column(String(512), nullable=True, comment="关键词")
    requirement_no: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, comment="需求编号")
    subject_no: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, comment="标的编号")
    procurement_no: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, comment="采购记录编号")
    subject_name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, comment="标的名称")
    timeline_template_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("timeline_templates.id", ondelete="SET NULL"),
        nullable=True, index=True, comment="时间轴模板ID"
    )

    # ORM 关联
    fonds: Mapped["Fonds"] = relationship("Fonds", foreign_keys=[fonds_id])
    category: Mapped["Category"] = relationship("Category", foreign_keys=[category_id])
    classification: Mapped["Classification"] = relationship("Classification", foreign_keys=[classification_id])
    contract_type_rel: Mapped[Optional["ContractType"]] = relationship("ContractType", foreign_keys=[contract_type_id])
    supplier_rel = relationship("Supplier", lazy="selectin")
    milestones: Mapped[list["Milestone"]] = relationship(
        "Milestone", back_populates="contract", lazy="selectin", cascade="all, delete-orphan"
    )

    # ── 生命周期 ──
    lifecycle_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("lifecycle_templates.id", ondelete="SET NULL"),
        nullable=True, index=True, comment="生命周期模板ID"
    )
    lifecycle_stage_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("lifecycle_stages.id", ondelete="SET NULL"),
        nullable=True, index=True, comment="当前阶段ID"
    )
    # stage_links: { stage_id -> [{url, label}] } — 各阶段补充链接
    stage_links: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, default=None, comment="各阶段补充流程链接"
    )
    lifecycle: Mapped[Optional["LifecycleTemplate"]] = relationship("LifecycleTemplate", foreign_keys=[lifecycle_id])
    lifecycle_stage: Mapped[Optional["LifecycleStage"]] = relationship("LifecycleStage", foreign_keys=[lifecycle_stage_id])
    timeline_template: Mapped[Optional["TimelineTemplate"]] = relationship("TimelineTemplate", foreign_keys=[timeline_template_id])
    stage_logs: Mapped[list["ContractStageLog"]] = relationship(
        "ContractStageLog", back_populates="contract",
        lazy="selectin", cascade="all, delete-orphan",
        order_by="ContractStageLog.created_at.desc()"
    )

    # ── 自动续约 ──
    auto_renewal: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
        comment="是否启用自动续约"
    )
    renewal_remind_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=7,
        comment="续约提醒天数(到期前N天触发)"
    )

    __table_args__ = (
        Index("ix_contracts_user_status", "user_id", "status"),
        Index("ix_contracts_user_type", "user_id", "contract_type"),
    )

    def __repr__(self) -> str:
        return (
            f"<Contract(id={self.id}, contract_no={self.contract_no!r}, "
            f"contract_name={self.contract_name!r}, status={self.status!r})>"
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


class LifecycleTemplate(TimestampMixin, Base):
    """生命周期模板 — 用户自定义的合同阶段流程"""
    __tablename__ = "lifecycle_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[UUID] = mapped_column(SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    stages: Mapped[list["LifecycleStage"]] = relationship(
        "LifecycleStage", back_populates="template",
        lazy="selectin", cascade="all, delete-orphan",
        order_by="LifecycleStage.sort_order"
    )


class LifecycleStage(TimestampMixin, Base):
    """生命周期阶段"""
    __tablename__ = "lifecycle_stages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lifecycle_templates.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    stage_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="custom"
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    auto_transition_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    template: Mapped["LifecycleTemplate"] = relationship("LifecycleTemplate", back_populates="stages")


class ContractStageLog(TimestampMixin, Base):
    """合同阶段流转日志"""
    __tablename__ = "contract_stage_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    lifecycle_id: Mapped[int] = mapped_column(Integer, nullable=False)
    from_stage_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    to_stage_id: Mapped[int] = mapped_column(Integer, nullable=False)
    from_stage_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    to_stage_name: Mapped[str] = mapped_column(String(128), nullable=False)
    triggered_by: Mapped[str] = mapped_column(
        String(16), nullable=False, default="manual"
    )
    operator_id: Mapped[Optional[UUID]] = mapped_column(SAUUID(as_uuid=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    contract: Mapped["Contract"] = relationship("Contract", back_populates="stage_logs")


class ContractType(TimestampMixin, Base):
    """合同类型 — 用户可自定义的合同分类"""
    __tablename__ = "contract_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[UUID] = mapped_column(SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False, comment="类型名称")
    code: Mapped[str] = mapped_column(String(32), nullable=False, comment="类型编码（英文标识）")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="描述")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="是否启用")

    __table_args__ = (
        UniqueConstraint("user_id", "code", name="uq_contract_types_user_code"),
    )


class StageType(TimestampMixin, Base):
    """阶段类型 — 合同生命周期阶段的可配置类型"""

    __tablename__ = "stage_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[UUID] = mapped_column(SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True, comment="用户ID")
    name: Mapped[str] = mapped_column(String(64), nullable=False, comment="中文名称")
    code: Mapped[str] = mapped_column(String(32), nullable=False, comment="英文编码")
    color: Mapped[str] = mapped_column(String(16), nullable=False, default="gray", comment="显示颜色(hex或named)")
    default_status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", comment="对应合同状态")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="描述")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="是否启用")

    __table_args__ = (
        UniqueConstraint("user_id", "code", name="uq_stage_types_user_code"),
    )


class TimelineTemplate(TimestampMixin, Base):
    """时间轴模板 — 全局共享的合同时间轴节点配置"""

    __tablename__ = "timeline_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, comment="模板名称")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="描述")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="是否启用")

    nodes: Mapped[list["TimelineNode"]] = relationship(
        "TimelineNode", back_populates="template",
        lazy="selectin", cascade="all, delete-orphan",
        order_by="TimelineNode.sort_order"
    )

    def __repr__(self) -> str:
        return f"<TimelineTemplate(id={self.id}, name={self.name!r})>"


class TimelineNode(TimestampMixin, Base):
    """时间轴节点 — 模板中的预设节点"""

    __tablename__ = "timeline_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("timeline_templates.id", ondelete="CASCADE"),
        nullable=False, index=True, comment="所属模板ID"
    )
    label: Mapped[str] = mapped_column(String(128), nullable=False, comment="节点名称")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")
    date_source: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True,
        comment="日期来源: sign_date/start_date/end_date/created_at/custom"
    )
    active_statuses: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True, default=None,
        comment="此节点在哪些合同状态下视为已达成"
    )
    icon_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="circle",
        comment="图标类型"
    )
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, comment="是否必选")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="节点说明")

    template: Mapped["TimelineTemplate"] = relationship("TimelineTemplate", back_populates="nodes")

    __table_args__ = (
        Index("ix_timeline_nodes_template_order", "template_id", "sort_order"),
    )

    def __repr__(self) -> str:
        return f"<TimelineNode(id={self.id}, template_id={self.template_id}, label={self.label!r})>"


class ContractTimelineCustomNode(TimestampMixin, Base):
    """合同自定义时间轴节点 — 合同详情页 '+' 临时添加的 ad-hoc 节点"""

    __tablename__ = "contract_timeline_custom_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False, index=True, comment="所属合同ID"
    )
    label: Mapped[str] = mapped_column(String(128), nullable=False, comment="节点名称")
    date_value: Mapped[Optional[date]] = mapped_column(Date, nullable=True, comment="节点日期")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")
    icon_type: Mapped[str] = mapped_column(String(32), nullable=False, default="plus", comment="图标类型")

    __table_args__ = (
        Index("ix_ctcn_contract_order", "contract_id", "sort_order"),
    )

    def __repr__(self) -> str:
        return f"<ContractTimelineCustomNode(id={self.id}, contract_id={self.contract_id}, label={self.label!r})>"