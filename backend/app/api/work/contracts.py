"""合同管理模块 API — 全宗 / 分类 / 密级 / 合同 / 里程碑 / 仪表盘"""

import logging
import re
from pathlib import Path
from uuid import UUID, uuid4
from datetime import date, datetime
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, field_validator

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

PAYMENT_UPLOAD_ROOT = Path("uploads/contract-payments").resolve()
MAX_PAYMENT_ATTACHMENT_SIZE = 20 * 1024 * 1024


def _safe_pdf_filename(filename: str | None) -> str:
    """清理上传文件名，避免路径遍历和响应头注入。"""
    name = Path(filename or "attachment.pdf").name
    name = re.sub(r"[\r\n\x00-\x1f\x7f]+", "", name).strip()
    name = name.replace('"', "'")
    if not name.lower().endswith(".pdf"):
        name = "attachment.pdf"
    if len(name) > 180:
        stem = Path(name).stem[:170].rstrip() or "attachment"
        name = f"{stem}.pdf"
    return name or "attachment.pdf"


def _resolve_payment_attachment_path(raw_path: str) -> Path | None:
    """解析附件路径并限制在 PAYMENT_UPLOAD_ROOT 下。"""
    path = Path(raw_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    resolved = path.resolve()
    try:
        resolved.relative_to(PAYMENT_UPLOAD_ROOT)
    except ValueError:
        return None
    return resolved

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.contract import ContractType, Contract
from app.services import contract_service

router = APIRouter(prefix="/contracts", tags=["工作-合同"], redirect_slashes=False)


# ── Pydantic Schemas ──────────────────────────────────────────────────


class FondsCreate(BaseModel):
    """创建全宗请求体"""
    name: str = Field(..., min_length=1, max_length=128, description="全宗名称")
    code: str = Field(..., min_length=1, max_length=64, description="全宗代码")
    description: Optional[str] = Field(default=None, description="描述")
    sort_order: int = Field(default=0, description="排序")


class FondsUpdate(BaseModel):
    """更新全宗请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128, description="全宗名称")
    code: Optional[str] = Field(default=None, min_length=1, max_length=64, description="全宗代码")
    description: Optional[str] = Field(default=None, description="描述")
    sort_order: Optional[int] = Field(default=None, description="排序")


class CategoryCreate(BaseModel):
    """创建分类请求体"""
    name: str = Field(..., min_length=1, max_length=128, description="分类名称")
    code: str = Field(..., min_length=1, max_length=64, description="分类代码")
    fonds_id: int = Field(..., gt=0, description="所属全宗ID")
    parent_id: Optional[int] = Field(default=None, gt=0, description="父分类ID")
    description: Optional[str] = Field(default=None, description="描述")
    sort_order: int = Field(default=0, description="排序")


class CategoryUpdate(BaseModel):
    """更新分类请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128, description="分类名称")
    code: Optional[str] = Field(default=None, min_length=1, max_length=64, description="分类代码")
    fonds_id: Optional[int] = Field(default=None, gt=0, description="所属全宗ID")
    parent_id: Optional[int] = Field(default=None, gt=0, description="父分类ID")
    description: Optional[str] = Field(default=None, description="描述")
    sort_order: Optional[int] = Field(default=None, description="排序")


class ClassificationCreate(BaseModel):
    """创建密级请求体"""
    name: str = Field(..., min_length=1, max_length=64, description="密级名称")
    code: str = Field(..., min_length=1, max_length=32, description="密级代码")
    level: int = Field(..., ge=1, le=5, description="密级等级 1-5")
    description: Optional[str] = Field(default=None, description="描述")
    color: Optional[str] = Field(default=None, max_length=16, description="显示颜色")


class ClassificationUpdate(BaseModel):
    """更新密级请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=64, description="密级名称")
    code: Optional[str] = Field(default=None, min_length=1, max_length=32, description="密级代码")
    level: Optional[int] = Field(default=None, ge=1, le=5, description="密级等级 1-5")
    description: Optional[str] = Field(default=None, description="描述")
    color: Optional[str] = Field(default=None, max_length=16, description="显示颜色")


class ContractCreate(BaseModel):
    """创建合同请求体"""
    contract_no: str = Field(..., min_length=1, max_length=64, description="合同编号")
    contract_name: str = Field(..., min_length=1, max_length=256, description="合同名称")
    fonds_id: Optional[int] = Field(default=None, gt=0, description="所属全宗ID；为空时使用系统默认全宗")
    category_id: Optional[int] = Field(default=None, gt=0, description="所属分类ID；为空时使用系统默认分类")
    classification_id: int = Field(..., gt=0, description="密级ID")
    supplier_id: Optional[str] = Field(default=None, description="供应商ID（UUID字符串）")
    amount: float = Field(..., ge=0, description="合同金额")
    currency: str = Field(default="CNY", max_length=8, description="币种")
    sign_date: Optional[date] = Field(default=None, description="签订日期")
    start_date: Optional[date] = Field(default=None, description="开始日期")
    end_date: Optional[date] = Field(default=None, description="结束日期")
    status: str = Field(
        default="draft",
        pattern="^(draft|signed|in_progress|completed|terminated)$",
        description="合同状态"
    )
    contract_type: str = Field(
        default="other",
        pattern="^[a-z_][a-z0-9_]*$",
        description="合同类型 (deprecated → contract_type_id)"
    )
    contract_type_id: Optional[int] = Field(default=None, gt=0, description="合同类型ID (FK → contract_types)")
    requirement_no: Optional[str] = Field(
        default=None, max_length=32,
        pattern="^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$",
        description="需求编号"
    )
    subject_no: Optional[str] = Field(
        default=None, max_length=32,
        pattern="^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$",
        description="标的编号"
    )
    procurement_no: Optional[str] = Field(
        default=None, max_length=32,
        pattern="^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$",
        description="采购记录编号"
    )
    subject_name: Optional[str] = Field(default=None, max_length=256, description="标的名称")
    description: Optional[str] = Field(default=None, description="描述")
    keywords: Optional[str] = Field(default=None, max_length=512, description="关键词")
    auto_renewal: bool = Field(default=False, description="是否启用自动续约")
    renewal_remind_days: int = Field(default=7, ge=1, le=90, description="续约提醒天数(到期前N天触发)")
    payment_template: Optional[str] = Field(
        default=None, pattern="^(two|three)$", description="付款计划模板: two=两期(首付款/尾款), three=三期(首付款/进度款/尾款)"
    )

    @field_validator('keywords', mode='before')
    @classmethod
    def coerce_keywords(cls, v: Union[str, List[str], None]) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, list):
            return ', '.join(v)
        return v


class ContractUpdate(BaseModel):
    """更新合同请求体"""
    contract_no: Optional[str] = Field(default=None, min_length=1, max_length=64, description="合同编号")
    contract_name: Optional[str] = Field(default=None, min_length=1, max_length=256, description="合同名称")
    fonds_id: Optional[int] = Field(default=None, gt=0, description="所属全宗ID")
    category_id: Optional[int] = Field(default=None, gt=0, description="所属分类ID")
    classification_id: Optional[int] = Field(default=None, gt=0, description="密级ID")
    supplier_id: Optional[str] = Field(default=None, description="供应商ID（UUID字符串）")
    amount: Optional[float] = Field(default=None, ge=0, description="合同金额")
    currency: Optional[str] = Field(default=None, max_length=8, description="币种")
    sign_date: Optional[date] = Field(default=None, description="签订日期")
    start_date: Optional[date] = Field(default=None, description="开始日期")
    end_date: Optional[date] = Field(default=None, description="结束日期")
    status: Optional[str] = Field(
        default=None,
        pattern="^(draft|signed|in_progress|completed|terminated)$",
        description="合同状态"
    )
    contract_type: Optional[str] = Field(
        default=None,
        pattern="^[a-z_][a-z0-9_]*$",
        description="合同类型 (deprecated → contract_type_id)"
    )
    contract_type_id: Optional[int] = Field(default=None, gt=0, description="合同类型ID (FK → contract_types)")
    requirement_no: Optional[str] = Field(
        default=None, max_length=32,
        pattern="^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$",
        description="需求编号"
    )
    subject_no: Optional[str] = Field(
        default=None, max_length=32,
        pattern="^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$",
        description="标的编号"
    )
    procurement_no: Optional[str] = Field(
        default=None, max_length=32,
        pattern="^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$",
        description="采购记录编号"
    )
    subject_name: Optional[str] = Field(default=None, max_length=256, description="标的名称")
    description: Optional[str] = Field(default=None, description="描述")
    keywords: Optional[str] = Field(default=None, max_length=512, description="关键词")
    auto_renewal: Optional[bool] = Field(default=None, description="是否启用自动续约")
    renewal_remind_days: Optional[int] = Field(default=None, ge=1, le=90, description="续约提醒天数(到期前N天触发)")
    timeline_template_id: Optional[int] = Field(default=None, gt=0, description="时间轴模板ID")
    payment_template: Optional[str] = Field(
        default=None, pattern="^(two|three)$", description="付款计划模板: two=两期(首付款/尾款), three=三期(首付款/进度款/尾款)"
    )

    @field_validator('keywords', mode='before')
    @classmethod
    def coerce_keywords(cls, v: Union[str, List[str], None]) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, list):
            return ', '.join(v)
        return v


class MilestoneCreate(BaseModel):
    """创建里程碑请求体"""
    name: str = Field(..., min_length=1, max_length=256, description="里程碑名称")
    amount: float = Field(default=0, ge=0, description="里程碑金额")
    due_date: Optional[date] = Field(default=None, description="计划日期")
    completed_date: Optional[date] = Field(default=None, description="完成日期")
    status: str = Field(
        default="pending",
        pattern="^(pending|completed|overdue)$",
        description="状态"
    )
    sort_order: int = Field(default=0, description="排序")
    description: Optional[str] = Field(default=None, description="描述")


class MilestoneUpdate(BaseModel):
    """更新里程碑请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=256, description="里程碑名称")
    amount: Optional[float] = Field(default=None, ge=0, description="里程碑金额")
    due_date: Optional[date] = Field(default=None, description="计划日期")
    completed_date: Optional[date] = Field(default=None, description="完成日期")
    status: Optional[str] = Field(
        default=None,
        pattern="^(pending|completed|overdue)$",
        description="状态"
    )
    sort_order: Optional[int] = Field(default=None, description="排序")
    description: Optional[str] = Field(default=None, description="描述")


class ContractPaymentCreate(BaseModel):
    """创建付款期次请求体"""
    name: str = Field(..., min_length=1, max_length=128, description="期次名称")
    amount: Optional[float] = Field(default=None, ge=0, description="付款金额")
    currency: Optional[str] = Field(default=None, max_length=8, description="币种")
    acceptance_date: Optional[date] = Field(default=None, description="验收日期")
    actual_payment_date: Optional[date] = Field(default=None, description="实际付款日期")
    status: str = Field(default="pending", pattern="^(pending|paid|cancelled)$", description="状态")
    sort_order: int = Field(default=0, description="排序")
    notes: Optional[str] = Field(default=None, description="备注")


class ContractPaymentUpdate(BaseModel):
    """更新付款期次请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128, description="期次名称")
    amount: Optional[float] = Field(default=None, ge=0, description="付款金额")
    currency: Optional[str] = Field(default=None, max_length=8, description="币种")
    acceptance_date: Optional[date] = Field(default=None, description="验收日期")
    actual_payment_date: Optional[date] = Field(default=None, description="实际付款日期")
    status: Optional[str] = Field(default=None, pattern="^(pending|paid|cancelled)$", description="状态")
    sort_order: Optional[int] = Field(default=None, description="排序")
    notes: Optional[str] = Field(default=None, description="备注")


class ContractPaymentBulkCreate(BaseModel):
    """按模板快速生成付款计划"""
    template: str = Field(..., pattern="^(two|three)$", description="two=首付款/尾款; three=首付款/进度款/尾款")


class ContractPaymentMarkPaid(BaseModel):
    """标记已付款请求体"""
    actual_payment_date: Optional[date] = Field(default=None, description="实际付款日期")



class SupplierCreate(BaseModel):
    """创建供应商请求体"""
    name: str = Field(..., min_length=1, max_length=256, description="企业名称")

    # 供应商信息
    short_name: Optional[str] = Field(default=None, max_length=128, description="企业简称")
    english_name: Optional[str] = Field(default=None, max_length=256, description="英文名称")
    legal_person: Optional[str] = Field(default=None, max_length=128, description="法人")
    unified_social_credit_code: Optional[str] = Field(default=None, max_length=64, description="统一社会信用代码")
    taxpayer_type: Optional[str] = Field(default=None, max_length=32, description="纳税人标识")
    address: Optional[str] = Field(default=None, max_length=512, description="注册地址")
    business_scope: Optional[str] = Field(default=None, description="经营范围")

    # 联系人列表
    contacts: Optional[list] = Field(default=None, description="联系人列表 [{name,title,phone,landline,email}]")
    # 银行账户列表
    bank_accounts: Optional[list] = Field(default=None, description="银行账户列表 [{account_type,account_number,bank_name}]")

    rating: Optional[str] = Field(default=None, max_length=32, description="评级")
    status: Optional[str] = Field(default="active", max_length=32, description="状态: active/inactive")
    notes: Optional[str] = Field(default=None, description="备注")


class SupplierUpdate(BaseModel):
    """更新供应商请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=256, description="企业名称")

    short_name: Optional[str] = Field(default=None, max_length=128, description="企业简称")
    english_name: Optional[str] = Field(default=None, max_length=256, description="英文名称")
    legal_person: Optional[str] = Field(default=None, max_length=128, description="法人")
    unified_social_credit_code: Optional[str] = Field(default=None, max_length=64, description="统一社会信用代码")
    taxpayer_type: Optional[str] = Field(default=None, max_length=32, description="纳税人标识")
    address: Optional[str] = Field(default=None, max_length=512, description="注册地址")
    business_scope: Optional[str] = Field(default=None, description="经营范围")

    contacts: Optional[list] = Field(default=None, description="联系人列表")
    bank_accounts: Optional[list] = Field(default=None, description="银行账户列表")

    rating: Optional[str] = Field(default=None, max_length=32, description="评级")
    status: Optional[str] = Field(default=None, max_length=32, description="状态")
    notes: Optional[str] = Field(default=None, description="备注")


class CreateContractTypeRequest(BaseModel):
    """创建合同类型请求"""
    name: str = Field(..., min_length=1, max_length=64, description="类型名称")
    code: str = Field(..., min_length=1, max_length=32, pattern="^[a-z_][a-z0-9_]*$", description="类型编码（英文小写+下划线）")
    description: Optional[str] = Field(default=None, max_length=512, description="描述")
    sort_order: int = Field(default=0, ge=0, description="排序")


class UpdateContractTypeRequest(BaseModel):
    """更新合同类型请求"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=64, description="类型名称")
    description: Optional[str] = Field(default=None, max_length=512, description="描述")
    sort_order: Optional[int] = Field(default=None, ge=0, description="排序")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


class ContractTypeResponse(BaseModel):
    """合同类型响应"""
    id: int
    name: str
    code: str
    description: Optional[str] = None
    sort_order: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── 辅助序列化函数 ────────────────────────────────────────────────────


from sqlalchemy.exc import MissingGreenlet  # 异步懒加载异常


def _safe_fonds_to_dict(f) -> dict:
    """安全序列化 Fonds：MissingGreenlet 时返回 None"""
    try:
        return _fonds_to_dict(f)
    except (MissingGreenlet, Exception):
        return None


def _safe_category_to_dict(c) -> dict:
    """安全序列化 Category：嵌套 fonds 懒加载失败时返回 None"""
    d = _category_to_dict(c)
    # 尝试填充 fonds；若未预加载且异步上下文已退出，catch MissingGreenlet
    try:
        d["fonds"] = _fonds_to_dict(c.fonds) if c.fonds else None
    except (MissingGreenlet, Exception):
        d["fonds"] = None
    return d


def _fonds_to_dict(f) -> dict:
    return {
        "id": f.id,
        "name": f.name,
        "code": f.code,
        "description": f.description,
        "sort_order": f.sort_order,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "updated_at": f.updated_at.isoformat() if f.updated_at else None,
    }


def _category_to_dict(c) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "code": c.code,
        "fonds_id": c.fonds_id,
        "parent_id": c.parent_id,
        "description": c.description,
        "sort_order": c.sort_order,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


def _classification_to_dict(cl) -> dict:
    return {
        "id": cl.id,
        "name": cl.name,
        "code": cl.code,
        "level": cl.level,
        "description": cl.description,
        "color": cl.color,
        "created_at": cl.created_at.isoformat() if cl.created_at else None,
        "updated_at": cl.updated_at.isoformat() if cl.updated_at else None,
    }


def _contract_to_dict(ct) -> dict:
    return {
        "id": ct.id,
        "user_id": ct.user_id,
        "contract_no": ct.contract_no,
        "contract_name": ct.contract_name,
        "fonds_id": ct.fonds_id,
        "category_id": ct.category_id,
        "classification_id": ct.classification_id,
        "supplier_id": str(ct.supplier_id) if ct.supplier_id else None,
        "supplier": ct.supplier_rel.name if ct.supplier_rel else None,
        "amount": ct.amount,
        "currency": ct.currency,
        "sign_date": ct.sign_date.isoformat() if ct.sign_date else None,
        "start_date": ct.start_date.isoformat() if ct.start_date else None,
        "end_date": ct.end_date.isoformat() if ct.end_date else None,
        "status": ct.status,
        "contract_type": ct.contract_type,
        "contract_type_id": ct.contract_type_id,
        "requirement_no": ct.requirement_no,
        "subject_no": ct.subject_no,
        "procurement_no": ct.procurement_no,
        "subject_name": ct.subject_name,
        "description": ct.description,
        "keywords": ct.keywords,
        "fonds_name": ct.fonds.name if hasattr(ct, "fonds") and ct.fonds else None,
        "category_name": ct.category.name if hasattr(ct, "category") and ct.category else None,
        "classification_name": ct.classification.name if hasattr(ct, "classification") and ct.classification else None,
        "contract_type_name": ct.contract_type_rel.name if hasattr(ct, "contract_type_rel") and ct.contract_type_rel else None,
        "created_at": ct.created_at.isoformat() if ct.created_at else None,
        "updated_at": ct.updated_at.isoformat() if ct.updated_at else None,
        "fonds": _safe_fonds_to_dict(ct.fonds) if hasattr(ct, "fonds") and ct.fonds else None,
        "category": _safe_category_to_dict(ct.category) if hasattr(ct, "category") and ct.category else None,
        "classification": _classification_to_dict(ct.classification) if hasattr(ct, "classification") and ct.classification else None,
        "timeline_template_id": ct.timeline_template_id,
        "timeline_template_name": ct.timeline_template.name if ct.timeline_template else None,
        "payment_template": ct.payment_template,
        "auto_renewal": ct.auto_renewal,
        "renewal_remind_days": ct.renewal_remind_days,
    }


def _milestone_to_dict(m) -> dict:
    return {
        "id": m.id,
        "contract_id": m.contract_id,
        "name": m.name,
        "amount": m.amount,
        "due_date": m.due_date.isoformat() if m.due_date else None,
        "completed_date": m.completed_date.isoformat() if m.completed_date else None,
        "status": m.status,
        "sort_order": m.sort_order,
        "description": m.description,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


def _payment_attachment_to_dict(a) -> dict:
    return {
        "id": a.id,
        "payment_id": a.payment_id,
        "original_name": a.original_name,
        "stored_name": a.stored_name,
        "file_size": a.file_size,
        "content_type": a.content_type,
        "file_ext": a.file_ext,
        "uploaded_by": str(a.uploaded_by) if a.uploaded_by else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


def _payment_to_dict(p) -> dict:
    return {
        "id": p.id,
        "contract_id": p.contract_id,
        "name": p.name,
        "amount": float(p.amount) if p.amount is not None else None,
        "currency": p.currency,
        "acceptance_date": p.acceptance_date.isoformat() if p.acceptance_date else None,
        "actual_payment_date": p.actual_payment_date.isoformat() if p.actual_payment_date else None,
        "status": p.status,
        "sort_order": p.sort_order,
        "notes": p.notes,
        "attachments": [_payment_attachment_to_dict(a) for a in (p.attachments or [])],
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _supplier_to_dict(s) -> dict:
    return {
        "id": str(s.id),
        "user_id": str(s.user_id) if s.user_id else None,
        "name": s.name,
        "short_name": s.short_name,
        "english_name": s.english_name,
        "legal_person": s.legal_person,
        "unified_social_credit_code": s.unified_social_credit_code,
        "taxpayer_type": s.taxpayer_type,
        "address": s.address,
        "business_scope": s.business_scope,
        "business_license": s.business_license,
        "tax_id": s.tax_id,
        "contacts": s.contacts if isinstance(s.contacts, list) else (s.contacts or []),
        "bank_accounts": s.bank_accounts if isinstance(s.bank_accounts, list) else (s.bank_accounts or []),
        "contact_person": s.contact_person,
        "contact_phone": s.contact_phone,
        "bank_name": s.bank_name,
        "bank_account": s.bank_account,
        "dc_bank_name": s.dc_bank_name,
        "dc_bank_account": s.dc_bank_account,
        "rating": s.rating,
        "status": s.status,
        "notes": s.notes,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def _contract_type_to_dict(ct: "ContractType") -> dict:
    """ContractType → dict"""
    return {
        "id": ct.id,
        "name": ct.name,
        "code": ct.code,
        "description": ct.description,
        "sort_order": ct.sort_order,
        "is_active": ct.is_active,
        "created_at": ct.created_at.isoformat() if ct.created_at else None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  全宗 (Fonds) 端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/fonds", summary="获取全宗列表")
async def get_fonds_list(
    db: AsyncSession = Depends(get_db),
):
    """获取所有全宗"""
    items = await contract_service.list_fonds(db)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_fonds_to_dict(f) for f in items],
    }


@router.post("/fonds", summary="创建全宗")
async def create_fonds(
    body: FondsCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建新的全宗"""
    fonds = await contract_service.create_fonds(db, body.model_dump())
    return {
        "code": 0,
        "message": "全宗创建成功",
        "data": _fonds_to_dict(fonds),
    }


@router.get("/fonds/{fonds_id}", summary="获取全宗详情")
async def get_fonds(
    fonds_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取单个全宗详情"""
    fonds = await contract_service.get_fonds(db, fonds_id)
    if not fonds:
        raise HTTPException(status_code=404, detail="全宗不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": _fonds_to_dict(fonds),
    }


@router.patch("/fonds/{fonds_id}", summary="更新全宗")
async def update_fonds(
    fonds_id: int,
    body: FondsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新全宗信息"""
    fonds = await contract_service.update_fonds(
        db, fonds_id, body.model_dump(exclude_none=True)
    )
    if not fonds:
        raise HTTPException(status_code=404, detail="全宗不存在")
    return {
        "code": 0,
        "message": "全宗更新成功",
        "data": _fonds_to_dict(fonds),
    }


@router.delete("/fonds/{fonds_id}", summary="删除全宗")
async def delete_fonds(
    fonds_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除全宗"""
    success = await contract_service.delete_fonds(db, fonds_id)
    if not success:
        raise HTTPException(status_code=404, detail="全宗不存在")
    return {
        "code": 0,
        "message": "全宗删除成功",
        "data": None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  分类 (Category) 端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/categories", summary="获取分类列表")
async def get_categories_list(
    fonds_id: Optional[int] = Query(default=None, description="按全宗ID筛选"),
    db: AsyncSession = Depends(get_db),
):
    """获取分类列表，支持按全宗筛选"""
    items = await contract_service.list_categories(db, fonds_id=fonds_id)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_category_to_dict(c) for c in items],
    }


@router.post("/categories", summary="创建分类")
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建新的分类"""
    category = await contract_service.create_category(db, body.model_dump())
    return {
        "code": 0,
        "message": "分类创建成功",
        "data": _category_to_dict(category),
    }


@router.get("/categories/{category_id}", summary="获取分类详情")
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取单个分类详情"""
    category = await contract_service.get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": _category_to_dict(category),
    }


@router.patch("/categories/{category_id}", summary="更新分类")
async def update_category(
    category_id: int,
    body: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新分类信息"""
    category = await contract_service.update_category(
        db, category_id, body.model_dump(exclude_none=True)
    )
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    return {
        "code": 0,
        "message": "分类更新成功",
        "data": _category_to_dict(category),
    }


@router.delete("/categories/{category_id}", summary="删除分类")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除分类"""
    success = await contract_service.delete_category(db, category_id)
    if not success:
        raise HTTPException(status_code=404, detail="分类不存在")
    return {
        "code": 0,
        "message": "分类删除成功",
        "data": None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  密级 (Classification) 端点
# ═══════════════════════════════════════════════════════════════════════



# ── 密级种子数据 ─────────────────────────────────────

async def _seed_default_classifications(db: AsyncSession) -> None:
    """如果 classifications 表为空，插入默认密级"""
    from app.models.contract import Classification as CL
    result = await db.execute(select(func.count()).select_from(CL))
    count = result.scalar() or 0
    if count > 0:
        return

    defaults = [
        {"name": "公开", "code": "public", "level": 0, "color": "green", "description": "可对外公开的信息"},
        {"name": "内部", "code": "internal", "level": 1, "color": "blue", "description": "公司内部可流通"},
        {"name": "普通商密", "code": "confidential", "level": 2, "color": "amber", "description": "一般商业秘密"},
        {"name": "核心商密", "code": "secret", "level": 3, "color": "orange", "description": "核心商业秘密"},
        {"name": "绝密", "code": "top_secret", "level": 4, "color": "red", "description": "最高密级，严格管控"},
    ]
    for d in defaults:
        db.add(CL(**d))
    await db.flush()


@router.get("/classifications", summary="获取密级列表")
async def get_classifications_list(
    db: AsyncSession = Depends(get_db),
):
    """获取所有密级"""
    await _seed_default_classifications(db)
    items = await contract_service.list_classifications(db)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_classification_to_dict(c) for c in items],
    }


@router.post("/classifications", summary="创建密级")
async def create_classification(
    body: ClassificationCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建新的密级"""
    classification = await contract_service.create_classification(db, body.model_dump())
    return {
        "code": 0,
        "message": "密级创建成功",
        "data": _classification_to_dict(classification),
    }


@router.get("/classifications/{classification_id}", summary="获取密级详情")
async def get_classification(
    classification_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取单个密级详情"""
    classification = await contract_service.get_classification(db, classification_id)
    if not classification:
        raise HTTPException(status_code=404, detail="密级不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": _classification_to_dict(classification),
    }


@router.patch("/classifications/{classification_id}", summary="更新密级")
async def update_classification(
    classification_id: int,
    body: ClassificationUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新密级信息"""
    classification = await contract_service.update_classification(
        db, classification_id, body.model_dump(exclude_none=True)
    )
    if not classification:
        raise HTTPException(status_code=404, detail="密级不存在")
    return {
        "code": 0,
        "message": "密级更新成功",
        "data": _classification_to_dict(classification),
    }


@router.delete("/classifications/{classification_id}", summary="删除密级")
async def delete_classification(
    classification_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除密级"""
    success = await contract_service.delete_classification(db, classification_id)
    if not success:
        raise HTTPException(status_code=404, detail="密级不存在")
    return {
        "code": 0,
        "message": "密级删除成功",
        "data": None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  合同 (Contract) 端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("", summary="获取合同列表")
async def get_contracts_list(
    current_user: User = Depends(get_current_user),
    fonds_id: Optional[int] = Query(default=None, description="按全宗ID筛选"),
    category_id: Optional[int] = Query(default=None, description="按分类ID筛选"),
    status: Optional[str] = Query(default=None, description="按状态筛选"),
    contract_type: Optional[str] = Query(default=None, description="按类型筛选 (deprecated, 用contract_type_id)"),
    contract_type_id: Optional[int] = Query(default=None, description="按合同类型ID筛选"),
    search: Optional[str] = Query(default=None, description="搜索关键词"),
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取合同列表，支持分页+多条件筛选+搜索"""
    items, total = await contract_service.list_contracts(
        db,
        user_id=current_user.id,
        fonds_id=fonds_id,
        category_id=category_id,
        status=status,
        contract_type=contract_type,
        contract_type_id=contract_type_id,
        search=search,
        page=page,
        page_size=page_size,
    )
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_contract_to_dict(c) for c in items],
        "paging": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        },
    }


@router.post("", summary="创建合同")
async def create_contract(
    body: ContractCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的合同"""
    try:
        contract = await contract_service.create_contract(db, current_user.id, body.model_dump())
        return {
            "code": 0,
            "message": "合同创建成功",
            "data": _contract_to_dict(contract),
        }
    except IntegrityError as e:
        await db.rollback()
        orig = str(e.orig).lower() if e.orig else ""
        if "unique" in orig or "duplicate" in orig:
            if "contract_no" in orig:
                return {"code": 1, "message": "合同编号已存在，请使用不同的编号"}
            return {"code": 1, "message": "数据唯一性冲突，请检查输入"}
        if "foreign key" in orig or "fk_" in orig:
            return {"code": 1, "message": "关联数据不存在，请检查全宗/分类/供应商/合同类型等是否有效"}
        logger.exception("创建合同 IntegrityError: %s", e)
        return {"code": 1, "message": "数据完整性错误，请检查输入"}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        await db.rollback()
        logger.exception("创建合同失败: user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")



# ═══════════════════════════════════════════════════════════════════════
#  供应商 (Supplier) 端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/suppliers", summary="获取供应商列表")
async def get_suppliers_list(
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(default=None, description="搜索关键词"),
    status: Optional[str] = Query(default=None, description="按状态筛选"),
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取供应商列表，支持分页+搜索+状态筛选"""
    items, total = await contract_service.list_suppliers(
        db,
        search=search,
        status=status,
        page=page,
        page_size=page_size,
    )
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_supplier_to_dict(s) for s in items],
        "paging": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0,
        },
    }


@router.post("/suppliers", summary="创建供应商")
async def create_supplier(
    body: SupplierCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的供应商"""
    supplier = await contract_service.create_supplier(db, current_user.id, body.model_dump())
    return {
        "code": 0,
        "message": "供应商创建成功",
        "data": _supplier_to_dict(supplier),
    }


@router.get("/suppliers/{supplier_id}", summary="获取供应商详情")
async def get_supplier(
    supplier_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个供应商详情"""
    supplier = await contract_service.get_supplier(db, supplier_id, current_user.id)
    if not supplier:
        raise HTTPException(status_code=404, detail="供应商不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": _supplier_to_dict(supplier),
    }


@router.patch("/suppliers/{supplier_id}", summary="更新供应商")
async def update_supplier(
    supplier_id: str,
    body: SupplierUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新供应商信息"""
    supplier = await contract_service.update_supplier(
        db, supplier_id, current_user.id, body.model_dump(exclude_none=True)
    )
    if not supplier:
        raise HTTPException(status_code=404, detail="供应商不存在")
    return {
        "code": 0,
        "message": "供应商更新成功",
        "data": _supplier_to_dict(supplier),
    }


@router.delete("/suppliers/{supplier_id}", summary="删除供应商")
async def delete_supplier(
    supplier_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除供应商"""
    success = await contract_service.delete_supplier(db, supplier_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="供应商不存在")
    return {
        "code": 0,
        "message": "供应商删除成功",
        "data": None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  仪表盘
# ═══════════════════════════════════════════════════════════════════════


@router.get("/dashboard", summary="合同仪表盘")
async def dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取合同仪表盘聚合数据"""
    data = await contract_service.get_contract_dashboard(db, current_user.id)
    return {
        "code": 0,
        "message": "查询成功",
        "data": data,
    }

# ═══════════════════════════════════════════════════════════════════════
#  合同类型 CRUD
# ═══════════════════════════════════════════════════════════════════════
# ═══════════════════════════════════════════════════════════

@router.get("/contract-types", summary="获取合同类型列表")
async def list_contract_types(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    include_inactive: bool = Query(default=False, description="是否包含已禁用的类型"),
):
    """获取当前用户的所有合同类型"""
    conditions = []
    if not include_inactive:
        conditions.append(ContractType.is_active == True)
    result = await db.execute(
        select(ContractType).where(*conditions).order_by(ContractType.sort_order, ContractType.id)
    )
    types = result.scalars().all()
    return {"code": 0, "data": [_contract_type_to_dict(t) for t in types]}


@router.post("/contract-types", summary="创建合同类型")
async def create_contract_type(
    body: CreateContractTypeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的合同类型"""
    # 检查 code 唯一性
    existing = await db.execute(
        select(ContractType).where(
            ContractType.user_id == user.id,
            ContractType.code == body.code
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"编码 '{body.code}' 已存在")

    ct = ContractType(
        user_id=user.id,
        name=body.name,
        code=body.code,
        description=body.description,
        sort_order=body.sort_order,
        is_active=True,
    )
    db.add(ct)
    await db.commit()
    await db.refresh(ct)
    return {"code": 0, "data": _contract_type_to_dict(ct), "message": "合同类型创建成功"}


@router.get("/contract-types/{type_id}", summary="获取合同类型详情")
async def get_contract_type(
    type_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个合同类型详情"""
    result = await db.execute(
        select(ContractType).where(ContractType.id == type_id, ContractType.user_id == user.id)
    )
    ct = result.scalar_one_or_none()
    if not ct:
        raise HTTPException(status_code=404, detail="合同类型不存在")
    return {"code": 0, "data": _contract_type_to_dict(ct)}


@router.patch("/contract-types/{type_id}", summary="更新合同类型")
async def update_contract_type(
    type_id: int,
    body: UpdateContractTypeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新合同类型信息"""
    result = await db.execute(
        select(ContractType).where(ContractType.id == type_id, ContractType.user_id == user.id)
    )
    ct = result.scalar_one_or_none()
    if not ct:
        raise HTTPException(status_code=404, detail="合同类型不存在")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ct, key, value)

    await db.commit()
    await db.refresh(ct)
    return {"code": 0, "data": _contract_type_to_dict(ct), "message": "合同类型更新成功"}


@router.delete("/contract-types/{type_id}", summary="删除合同类型")
async def delete_contract_type(
    type_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除合同类型（检查是否有关联合同）"""
    result = await db.execute(
        select(ContractType).where(ContractType.id == type_id, ContractType.user_id == user.id)
    )
    ct = result.scalar_one_or_none()
    if not ct:
        raise HTTPException(status_code=404, detail="合同类型不存在")

    # 检查是否有关联合同
    contract_count = await db.execute(
        select(func.count(Contract.id)).where(
            Contract.user_id == user.id,
            Contract.contract_type == ct.code
        )
    )
    if contract_count.scalar() > 0:
        raise HTTPException(status_code=400, detail=f"该类型下有 {contract_count.scalar()} 个合同，无法删除")

    await db.delete(ct)
    await db.commit()
    return {"code": 0, "message": "合同类型删除成功"}




# ═══════════════════════════════════════════════════════════════════════
#  合同付款计划 / PDF 附件端点 — 必须在 /{contract_id} 参数路由之前定义
# ═══════════════════════════════════════════════════════════════════════


@router.get("/{contract_id}/payments", summary="获取合同付款计划")
async def list_contract_payments(
    contract_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await contract_service.list_contract_payments(db, contract_id, current_user.id)
    return {"code": 0, "message": "查询成功", "data": [_payment_to_dict(p) for p in items]}


@router.post("/{contract_id}/payments", summary="创建合同付款期次")
async def create_contract_payment(
    contract_id: int,
    body: ContractPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await contract_service.create_contract_payment(db, contract_id, current_user.id, body.model_dump(exclude_none=True))
    if not payment:
        raise HTTPException(status_code=404, detail="合同不存在")
    return {"code": 0, "message": "付款期次创建成功", "data": _payment_to_dict(payment)}


@router.post("/{contract_id}/payments/bulk", summary="按模板生成合同付款计划")
async def bulk_create_contract_payments(
    contract_id: int,
    body: ContractPaymentBulkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payments = await contract_service.bulk_create_contract_payments(db, contract_id, current_user.id, body.template)
    if payments is None:
        raise HTTPException(status_code=404, detail="合同不存在")
    return {"code": 0, "message": "付款计划生成成功", "data": [_payment_to_dict(p) for p in payments]}


@router.patch("/payments/{payment_id}", summary="更新合同付款期次")
async def update_contract_payment(
    payment_id: int,
    body: ContractPaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await contract_service.update_contract_payment(db, payment_id, current_user.id, body.model_dump(exclude_unset=True))
    if not payment:
        raise HTTPException(status_code=404, detail="付款期次不存在")
    return {"code": 0, "message": "付款期次更新成功", "data": _payment_to_dict(payment)}


@router.delete("/payments/{payment_id}", summary="删除合同付款期次")
async def delete_contract_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ok = await contract_service.delete_contract_payment(db, payment_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="付款期次不存在")
    return {"code": 0, "message": "付款期次删除成功", "data": None}


@router.patch("/payments/{payment_id}/mark-paid", summary="标记付款期次为已付款")
async def mark_contract_payment_paid(
    payment_id: int,
    body: Optional[ContractPaymentMarkPaid] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await contract_service.mark_contract_payment_paid(
        db, payment_id, current_user.id, body.actual_payment_date if body else None
    )
    if not payment:
        raise HTTPException(status_code=404, detail="付款期次不存在")
    return {"code": 0, "message": "已标记为已付款", "data": _payment_to_dict(payment)}


@router.post("/payments/{payment_id}/attachments", summary="上传付款 PDF 附件")
async def upload_contract_payment_attachment(
    payment_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await contract_service.get_contract_payment(db, payment_id, current_user.id)
    if not payment:
        raise HTTPException(status_code=404, detail="付款期次不存在")

    original_name = _safe_pdf_filename(file.filename)
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="仅支持上传 PDF 文件")

    content = await file.read()
    if len(content) > MAX_PAYMENT_ATTACHMENT_SIZE:
        raise HTTPException(status_code=400, detail="PDF 文件不能超过 20MB")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="文件内容不是有效的 PDF")

    upload_dir = PAYMENT_UPLOAD_ROOT / str(payment.contract_id) / str(payment_id)
    await run_in_threadpool(upload_dir.mkdir, parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}.pdf"
    file_path = upload_dir / stored_name
    await run_in_threadpool(file_path.write_bytes, content)

    attachment = await contract_service.create_contract_payment_attachment(db, payment_id, current_user.id, {
        "original_name": original_name,
        "stored_name": stored_name,
        "file_path": str(file_path),
        "file_size": len(content),
        "content_type": "application/pdf",
        "file_ext": "pdf",
    })
    if not attachment:
        try:
            file_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise HTTPException(status_code=404, detail="付款期次不存在")
    return {"code": 0, "message": "附件上传成功", "data": _payment_attachment_to_dict(attachment)}


@router.get("/payments/{payment_id}/attachments", summary="获取付款附件列表")
async def list_contract_payment_attachments(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment = await contract_service.get_contract_payment(db, payment_id, current_user.id)
    if not payment:
        raise HTTPException(status_code=404, detail="付款期次不存在")
    return {"code": 0, "message": "查询成功", "data": [_payment_attachment_to_dict(a) for a in payment.attachments]}


@router.get("/payments/attachments/{attachment_id}/preview", summary="在线预览付款 PDF 附件")
async def preview_contract_payment_attachment(
    attachment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    attachment = await contract_service.get_contract_payment_attachment(db, attachment_id, current_user.id)
    if not attachment:
        raise HTTPException(status_code=404, detail="附件不存在")
    path = _resolve_payment_attachment_path(attachment.file_path)
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(path, media_type="application/pdf", filename=_safe_pdf_filename(attachment.original_name))


@router.delete("/payments/attachments/{attachment_id}", summary="删除付款 PDF 附件")
async def delete_contract_payment_attachment(
    attachment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    attachment = await contract_service.delete_contract_payment_attachment(db, attachment_id, current_user.id)
    if not attachment:
        raise HTTPException(status_code=404, detail="附件不存在")
    try:
        path = _resolve_payment_attachment_path(attachment.file_path)
        if path:
            await run_in_threadpool(path.unlink, missing_ok=True)
    except Exception:
        logger.warning("删除付款附件磁盘文件失败: %s", attachment.file_path, exc_info=True)
    return {"code": 0, "message": "附件删除成功", "data": None}

# ═══════════════════════════════════════════════════════════
#  阶段类型 (StageType) CRUD — 必须在 /{contract_id} 之前定义
# ═══════════════════════════════════════════════════════════

# ── StageType Schemas ─────────────────────────────────────

class StageTypeCreate(BaseModel):
    """创建阶段类型请求体"""
    name: str = Field(..., min_length=1, max_length=64, description="中文名称")
    code: str = Field(..., min_length=1, max_length=32, pattern="^[a-z_]+$", description="英文编码(小写+下划线)")
    color: str = Field(default="gray", min_length=1, max_length=16, description="显示颜色(hex或named)")
    default_status: str = Field(default="draft", min_length=1, max_length=32, description="对应合同状态")
    description: Optional[str] = Field(default=None, description="描述")
    sort_order: int = Field(default=0, description="排序")


class StageTypeUpdate(BaseModel):
    """更新阶段类型请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=64, description="中文名称")
    code: Optional[str] = Field(default=None, min_length=1, max_length=32, pattern="^[a-z_]+$", description="英文编码(小写+下划线)")
    color: Optional[str] = Field(default=None, min_length=1, max_length=16, description="显示颜色(hex或named)")
    default_status: Optional[str] = Field(default=None, min_length=1, max_length=32, description="对应合同状态")
    description: Optional[str] = Field(default=None, description="描述")
    sort_order: Optional[int] = Field(default=None, description="排序")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


def _stage_type_to_dict(st: "StageType") -> dict:
    """StageType → dict"""
    from app.models.contract import StageType as ST
    return {
        "id": st.id,
        "name": st.name,
        "code": st.code,
        "color": st.color,
        "default_status": st.default_status,
        "description": st.description,
        "sort_order": st.sort_order,
        "is_active": st.is_active,
        "created_at": st.created_at.isoformat() if st.created_at else None,
        "updated_at": st.updated_at.isoformat() if st.updated_at else None,
    }


# ── 种子数据 ─────────────────────────────────────────────

async def _seed_default_stage_types(db: AsyncSession, user_id: UUID) -> None:
    """如果 stage_types 表为空，插入默认的8种阶段类型"""
    from app.models.contract import StageType as ST
    result = await db.execute(
        select(func.count()).select_from(ST).where(ST.user_id == user_id)
    )
    count = result.scalar() or 0
    if count > 0:
        return

    defaults = [
        {"name": "拟定", "code": "drafting", "color": "blue", "default_status": "draft", "sort_order": 1},
        {"name": "审核", "code": "review", "color": "amber", "default_status": "draft", "sort_order": 2},
        {"name": "签署", "code": "signing", "color": "green", "default_status": "signed", "sort_order": 3},
        {"name": "履约", "code": "execution", "color": "purple", "default_status": "in_progress", "sort_order": 4},
        {"name": "续约", "code": "renewal", "color": "pink", "default_status": "in_progress", "sort_order": 5},
        {"name": "终止", "code": "termination", "color": "red", "default_status": "terminated", "sort_order": 6},
        {"name": "归档", "code": "archived", "color": "gray", "default_status": "completed", "sort_order": 7},
        {"name": "自定义", "code": "custom", "color": "gray", "default_status": "draft", "sort_order": 8},
    ]
    for d in defaults:
        db.add(ST(
            user_id=user_id,
            name=d["name"],
            code=d["code"],
            color=d["color"],
            default_status=d["default_status"],
            sort_order=d["sort_order"],
            is_active=True,
        ))
    await db.flush()


async def _seed_default_timeline_template(db: AsyncSession) -> None:
    """如果 timeline_templates 表为空，创建默认「标准流程」模板"""
    await contract_service.seed_default_timeline_template(db)


# ── StageType 端点 ────────────────────────────────────────

@router.get("/stage-types", summary="获取阶段类型列表")
async def list_stage_types(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    include_inactive: bool = Query(default=False, description="是否包含已禁用的类型"),
):
    """获取当前用户的所有阶段类型"""
    from app.models.contract import StageType as ST
    await _seed_default_stage_types(db, user.id)

    conditions = [ST.user_id == user.id]
    if not include_inactive:
        conditions.append(ST.is_active == True)

    result = await db.execute(
        select(ST).where(*conditions).order_by(ST.sort_order, ST.id)
    )
    items = result.scalars().all()
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_stage_type_to_dict(t) for t in items],
    }


@router.get("/stage-types/active", summary="获取启用的阶段类型列表")
async def list_active_stage_types(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取仅启用的阶段类型，供前端下拉使用"""
    from app.models.contract import StageType as ST
    await _seed_default_stage_types(db, user.id)

    result = await db.execute(
        select(ST)
        .where(ST.user_id == user.id, ST.is_active == True)
        .order_by(ST.sort_order, ST.id)
    )
    items = result.scalars().all()
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_stage_type_to_dict(t) for t in items],
    }


@router.post("/stage-types", summary="创建阶段类型")
async def create_stage_type(
    body: StageTypeCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的阶段类型"""
    from app.models.contract import StageType as ST

    # 检查 code 唯一性
    existing = await db.execute(
        select(ST).where(ST.user_id == user.id, ST.code == body.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"编码 '{body.code}' 已存在")

    st = ST(
        user_id=user.id,
        name=body.name,
        code=body.code,
        color=body.color,
        default_status=body.default_status,
        description=body.description,
        sort_order=body.sort_order,
        is_active=True,
    )
    db.add(st)
    await db.commit()
    await db.refresh(st)
    return {
        "code": 0,
        "message": "阶段类型创建成功",
        "data": _stage_type_to_dict(st),
    }


@router.get("/stage-types/{stage_type_id}", summary="获取阶段类型详情")
async def get_stage_type(
    stage_type_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个阶段类型详情"""
    from app.models.contract import StageType as ST
    result = await db.execute(
        select(ST).where(ST.id == stage_type_id, ST.user_id == user.id)
    )
    st = result.scalar_one_or_none()
    if not st:
        raise HTTPException(status_code=404, detail="阶段类型不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": _stage_type_to_dict(st),
    }


@router.patch("/stage-types/{stage_type_id}", summary="更新阶段类型")
async def update_stage_type(
    stage_type_id: int,
    body: StageTypeUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新阶段类型信息"""
    from app.models.contract import StageType as ST
    result = await db.execute(
        select(ST).where(ST.id == stage_type_id, ST.user_id == user.id)
    )
    st = result.scalar_one_or_none()
    if not st:
        raise HTTPException(status_code=404, detail="阶段类型不存在")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(st, key, value)

    await db.commit()
    await db.refresh(st)
    return {
        "code": 0,
        "message": "阶段类型更新成功",
        "data": _stage_type_to_dict(st),
    }


@router.delete("/stage-types/{stage_type_id}", summary="删除阶段类型")
async def delete_stage_type(
    stage_type_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除阶段类型"""
    from app.models.contract import StageType as ST
    result = await db.execute(
        select(ST).where(ST.id == stage_type_id, ST.user_id == user.id)
    )
    st = result.scalar_one_or_none()
    if not st:
        raise HTTPException(status_code=404, detail="阶段类型不存在")

    await db.delete(st)
    await db.commit()
    return {
        "code": 0,
        "message": "阶段类型删除成功",
        "data": None,
    }


# ═══════════════════════════════════════════════════════════
#  时间轴模板 (TimelineTemplate) CRUD — 必须在 /{contract_id} 之前定义
# ═══════════════════════════════════════════════════════════

# ── Timeline Schemas ─────────────────────────────────────

class TimelineTemplateCreate(BaseModel):
    """创建时间轴模板请求体"""
    name: str = Field(..., min_length=1, max_length=128, description="模板名称")
    description: Optional[str] = Field(default=None, description="描述")
    is_active: bool = Field(default=True, description="是否启用")


class TimelineTemplateUpdate(BaseModel):
    """更新时间轴模板请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128, description="模板名称")
    description: Optional[str] = Field(default=None, description="描述")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


class TimelineNodeCreate(BaseModel):
    """创建时间轴节点请求体"""
    label: str = Field(..., min_length=1, max_length=128, description="节点名称")
    sort_order: int = Field(default=0, description="排序")
    date_source: Optional[str] = Field(default=None, max_length=64, description="日期来源")
    active_statuses: Optional[list] = Field(default=None, description="此节点在哪些合同状态下视为已达成")
    icon_type: str = Field(default="circle", max_length=32, description="图标类型")
    is_required: bool = Field(default=True, description="是否必选")
    description: Optional[str] = Field(default=None, description="节点说明")


class TimelineNodeUpdate(BaseModel):
    """更新时间轴节点请求体"""
    label: Optional[str] = Field(default=None, min_length=1, max_length=128, description="节点名称")
    sort_order: Optional[int] = Field(default=None, description="排序")
    date_source: Optional[str] = Field(default=None, max_length=64, description="日期来源")
    active_statuses: Optional[list] = Field(default=None, description="此节点在哪些合同状态下视为已达成")
    icon_type: Optional[str] = Field(default=None, max_length=32, description="图标类型")
    is_required: Optional[bool] = Field(default=None, description="是否必选")
    description: Optional[str] = Field(default=None, description="节点说明")


class ContractTimelineCustomNodeCreate(BaseModel):
    """创建合同自定义时间轴节点请求体"""
    label: str = Field(..., min_length=1, max_length=128, description="节点名称")
    date_value: Optional[date] = Field(default=None, description="节点日期")
    sort_order: int = Field(default=0, description="排序")
    icon_type: str = Field(default="plus", max_length=32, description="图标类型")


# ── 序列化辅助 ───────────────────────────────────────────

def _timeline_template_to_dict(t) -> dict:
    """TimelineTemplate → dict"""
    return {
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "is_active": t.is_active,
        "nodes": [_timeline_node_to_dict(n) for n in (t.nodes or [])],
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _timeline_node_to_dict(n) -> dict:
    """TimelineNode → dict"""
    return {
        "id": n.id,
        "template_id": n.template_id,
        "label": n.label,
        "sort_order": n.sort_order,
        "date_source": n.date_source,
        "active_statuses": n.active_statuses,
        "icon_type": n.icon_type,
        "is_required": n.is_required,
        "description": n.description,
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "updated_at": n.updated_at.isoformat() if n.updated_at else None,
    }


def _contract_custom_node_to_dict(n) -> dict:
    """ContractTimelineCustomNode → dict"""
    return {
        "id": n.id,
        "contract_id": n.contract_id,
        "label": n.label,
        "date_value": n.date_value.isoformat() if n.date_value else None,
        "sort_order": n.sort_order,
        "icon_type": n.icon_type,
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "updated_at": n.updated_at.isoformat() if n.updated_at else None,
    }


# ── Timeline Templates 端点 ──────────────────────────────

@router.get("/timeline-templates", summary="获取时间轴模板列表")
async def list_timeline_templates(
    db: AsyncSession = Depends(get_db),
):
    """获取所有时间轴模板（含节点）"""
    await _seed_default_timeline_template(db)
    templates = await contract_service.list_timeline_templates(db)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_timeline_template_to_dict(t) for t in templates],
    }


@router.post("/timeline-templates", summary="创建时间轴模板")
async def create_timeline_template(
    body: TimelineTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的时间轴模板"""
    template = await contract_service.create_timeline_template(
        db, body.model_dump()
    )
    return {
        "code": 0,
        "message": "时间轴模板创建成功",
        "data": _timeline_template_to_dict(template),
    }


@router.get("/timeline-templates/{template_id}", summary="获取时间轴模板详情")
async def get_timeline_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取单个时间轴模板及其所有节点"""
    template = await contract_service.get_timeline_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="时间轴模板不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": _timeline_template_to_dict(template),
    }


@router.patch("/timeline-templates/{template_id}", summary="更新时间轴模板")
async def update_timeline_template(
    template_id: int,
    body: TimelineTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新时间轴模板信息"""
    template = await contract_service.update_timeline_template(
        db, template_id, body.model_dump(exclude_unset=True)
    )
    if not template:
        raise HTTPException(status_code=404, detail="时间轴模板不存在")
    return {
        "code": 0,
        "message": "时间轴模板更新成功",
        "data": _timeline_template_to_dict(template),
    }


@router.delete("/timeline-templates/{template_id}", summary="删除时间轴模板")
async def delete_timeline_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除时间轴模板（级联删除其下所有节点）"""
    success = await contract_service.delete_timeline_template(db, template_id)
    if not success:
        raise HTTPException(status_code=404, detail="时间轴模板不存在")
    return {
        "code": 0,
        "message": "时间轴模板删除成功",
        "data": None,
    }


# ── Timeline Nodes 端点 ──────────────────────────────────

@router.get("/timeline-templates/{template_id}/nodes", summary="获取模板节点列表")
async def list_timeline_nodes(
    template_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取指定模板下的所有节点"""
    nodes = await contract_service.list_timeline_nodes(db, template_id)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_timeline_node_to_dict(n) for n in nodes],
    }


@router.post("/timeline-templates/{template_id}/nodes", summary="创建模板节点")
async def create_timeline_node(
    template_id: int,
    body: TimelineNodeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """在指定模板中创建节点"""
    node = await contract_service.create_timeline_node(
        db, template_id, body.model_dump()
    )
    return {
        "code": 0,
        "message": "节点创建成功",
        "data": _timeline_node_to_dict(node),
    }


@router.patch("/timeline-templates/{template_id}/nodes/{node_id}", summary="更新模板节点")
async def update_timeline_node(
    template_id: int,
    node_id: int,
    body: TimelineNodeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新节点信息"""
    node = await contract_service.update_timeline_node(
        db, node_id, body.model_dump(exclude_unset=True)
    )
    if not node:
        raise HTTPException(status_code=404, detail="节点不存在")
    return {
        "code": 0,
        "message": "节点更新成功",
        "data": _timeline_node_to_dict(node),
    }


@router.delete("/timeline-templates/{template_id}/nodes/{node_id}", summary="删除模板节点")
async def delete_timeline_node(
    template_id: int,
    node_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除节点"""
    success = await contract_service.delete_timeline_node(db, node_id)
    if not success:
        raise HTTPException(status_code=404, detail="节点不存在")
    return {
        "code": 0,
        "message": "节点删除成功",
        "data": None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  组织架构 CRUD
# ═══════════════════════════════════════════════════════════════════════

from app.models.department import Department as DepartmentModel


class DepartmentCreate(BaseModel):
    """创建部门请求体"""
    id: str = Field(
        ..., min_length=1, max_length=16, pattern=r"^\d+$",
        description="部门ID（纯数字字符串，如 001、0101）"
    )
    name: str = Field(..., min_length=1, max_length=128, description="部门名称")
    leader: Optional[str] = Field(default=None, max_length=64, description="负责人")
    business_contact: Optional[str] = Field(default=None, max_length=64, description="业务对接人")
    it_contact: Optional[str] = Field(default=None, max_length=64, description="IT对接人")
    remarks: Optional[str] = Field(default=None, description="备注")


class DepartmentUpdate(BaseModel):
    """更新部门请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128, description="部门名称")
    leader: Optional[str] = Field(default=None, max_length=64, description="负责人")
    business_contact: Optional[str] = Field(default=None, max_length=64, description="业务对接人")
    it_contact: Optional[str] = Field(default=None, max_length=64, description="IT对接人")
    remarks: Optional[str] = Field(default=None, description="备注")


class DepartmentResponse(BaseModel):
    """部门响应"""
    id: str
    name: str
    leader: Optional[str] = None
    business_contact: Optional[str] = None
    it_contact: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _department_to_dict(d: DepartmentModel) -> dict:
    return {
        "id": d.id,
        "name": d.name,
        "leader": d.leader,
        "business_contact": d.business_contact,
        "it_contact": d.it_contact,
        "remarks": d.remarks,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "updated_at": d.updated_at.isoformat() if d.updated_at else None,
    }


@router.get("/departments", summary="获取组织架构列表")
async def list_departments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(default=None, description="搜索部门名称/ID"),
):
    """获取当前用户的所有部门"""
    conditions = [DepartmentModel.user_id == user.id]
    if search:
        conditions.append(
            (DepartmentModel.name.ilike(f"%{search}%")) |
            (DepartmentModel.id.ilike(f"%{search}%"))
        )
    result = await db.execute(
        select(DepartmentModel).where(*conditions).order_by(DepartmentModel.id)
    )
    depts = result.scalars().all()
    return {"code": 0, "data": [_department_to_dict(d) for d in depts]}


@router.post("/departments", summary="创建部门")
async def create_department(
    body: DepartmentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的部门"""
    existing = await db.execute(
        select(DepartmentModel).where(DepartmentModel.id == body.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"部门ID '{body.id}' 已存在")

    dept = DepartmentModel(
        id=body.id,
        user_id=user.id,
        name=body.name,
        leader=body.leader,
        business_contact=body.business_contact,
        it_contact=body.it_contact,
        remarks=body.remarks,
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return {"code": 0, "data": _department_to_dict(dept), "message": "部门创建成功"}


@router.get("/departments/{dept_id}", summary="获取部门详情")
async def get_department(
    dept_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个部门详情"""
    result = await db.execute(
        select(DepartmentModel).where(
            DepartmentModel.id == dept_id, DepartmentModel.user_id == user.id
        )
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="部门不存在")
    return {"code": 0, "data": _department_to_dict(dept)}


@router.patch("/departments/{dept_id}", summary="更新部门")
async def update_department(
    dept_id: str,
    body: DepartmentUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新部门信息"""
    result = await db.execute(
        select(DepartmentModel).where(
            DepartmentModel.id == dept_id, DepartmentModel.user_id == user.id
        )
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="部门不存在")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)

    await db.commit()
    await db.refresh(dept)
    return {"code": 0, "data": _department_to_dict(dept), "message": "部门更新成功"}


@router.delete("/departments/{dept_id}", summary="删除部门")
async def delete_department(
    dept_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除部门"""
    result = await db.execute(
        select(DepartmentModel).where(
            DepartmentModel.id == dept_id, DepartmentModel.user_id == user.id
        )
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="部门不存在")

    await db.delete(dept)
    await db.commit()
    return {"code": 0, "message": "部门删除成功", "data": None}
# ── Contract Custom Timeline Nodes 端点 ──────────────────

@router.get("/{contract_id}/timeline-custom-nodes", summary="获取合同自定义时间轴节点")
async def list_contract_custom_nodes(
    contract_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取指定合同的所有自定义时间轴节点"""
    # 用户隔离：先确认合同属于当前用户
    contract = await contract_service.get_contract(db, contract_id, current_user.id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    nodes = await contract_service.list_contract_custom_nodes(db, contract_id)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_contract_custom_node_to_dict(n) for n in nodes],
    }


@router.post("/{contract_id}/timeline-custom-nodes", summary="创建合同自定义时间轴节点")
async def create_contract_custom_node(
    contract_id: int,
    body: ContractTimelineCustomNodeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """为指定合同创建自定义时间轴节点"""
    # 用户隔离
    contract = await contract_service.get_contract(db, contract_id, current_user.id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    node = await contract_service.create_contract_custom_node(
        db, contract_id, body.model_dump()
    )
    return {
        "code": 0,
        "message": "自定义节点创建成功",
        "data": _contract_custom_node_to_dict(node),
    }


@router.delete("/{contract_id}/timeline-custom-nodes/{node_id}", summary="删除合同自定义时间轴节点")
async def delete_contract_custom_node(
    contract_id: int,
    node_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除指定合同的自定义时间轴节点"""
    # 用户隔离
    contract = await contract_service.get_contract(db, contract_id, current_user.id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    success = await contract_service.delete_contract_custom_node(db, node_id)
    if not success:
        raise HTTPException(status_code=404, detail="自定义节点不存在")
    return {
        "code": 0,
        "message": "自定义节点删除成功",
        "data": None,
    }


@router.get("/{contract_id}", summary="获取合同详情")
async def get_contract(
    contract_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个合同详情（含里程碑列表）"""
    contract = await contract_service.get_contract(db, contract_id, current_user.id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    data = _contract_to_dict(contract)
    data["milestones"] = [
        _milestone_to_dict(m) for m in contract.milestones
    ] if hasattr(contract, "milestones") and contract.milestones else []
    data["cost_allocations"] = [
        _allocation_to_dict(a) for a in contract.cost_allocations
    ] if hasattr(contract, "cost_allocations") and contract.cost_allocations else []
    return {
        "code": 0,
        "message": "查询成功",
        "data": data,
    }


@router.patch("/{contract_id}", summary="更新合同")
async def update_contract(
    contract_id: int,
    body: ContractUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新合同信息"""
    contract = await contract_service.update_contract(
        db, contract_id, current_user.id, body.model_dump(exclude_none=True)
    )
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    return {
        "code": 0,
        "message": "合同更新成功",
        "data": _contract_to_dict(contract),
    }


@router.delete("/{contract_id}", summary="删除合同")
async def delete_contract(
    contract_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除合同（级联删除里程碑）"""
    success = await contract_service.delete_contract(db, contract_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="合同不存在")
    return {
        "code": 0,
        "message": "合同删除成功",
        "data": None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  里程碑 (Milestone) 端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/{contract_id}/milestones", summary="获取合同里程碑列表")
async def get_milestones_list(
    contract_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取指定合同的所有里程碑"""
    milestones = await contract_service.list_milestones(db, contract_id, current_user.id)
    # 如果合同不存在，返回404
    contract = await contract_service.get_contract(db, contract_id, current_user.id)
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_milestone_to_dict(m) for m in milestones],
    }


@router.post("/{contract_id}/milestones", summary="创建里程碑")
async def create_milestone(
    contract_id: int,
    body: MilestoneCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """为指定合同创建里程碑"""
    milestone = await contract_service.create_milestone(
        db, contract_id, current_user.id, body.model_dump()
    )
    if milestone is None:
        raise HTTPException(status_code=404, detail="合同不存在")
    return {
        "code": 0,
        "message": "里程碑创建成功",
        "data": _milestone_to_dict(milestone),
    }


@router.patch("/milestones/{milestone_id}", summary="更新里程碑")
async def update_milestone(
    milestone_id: int,
    body: MilestoneUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新里程碑信息"""
    milestone = await contract_service.update_milestone(
        db, milestone_id, current_user.id, body.model_dump(exclude_none=True)
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="里程碑不存在")
    return {
        "code": 0,
        "message": "里程碑更新成功",
        "data": _milestone_to_dict(milestone),
    }


@router.delete("/milestones/{milestone_id}", summary="删除里程碑")
async def delete_milestone(
    milestone_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除里程碑"""
    success = await contract_service.delete_milestone(db, milestone_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="里程碑不存在")
    return {
        "code": 0,
        "message": "里程碑删除成功",
        "data": None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  费用分摊 CRUD
# ═══════════════════════════════════════════════════════════════════════

from decimal import Decimal

from sqlalchemy import and_, delete

from app.models.cost_allocation import CostAllocation


class CostAllocationCreate(BaseModel):
    """单个分摊条目"""
    department_id: str = Field(..., description="部门ID")
    amount: Optional[Decimal] = Field(default=None, description="分摊金额")


class CostAllocationBulkSave(BaseModel):
    """批量保存分摊"""
    allocations: List[CostAllocationCreate] = Field(..., min_length=1, description="分摊列表")


def _allocation_to_dict(alloc: CostAllocation) -> dict:
    """将 CostAllocation ORM 对象转为字典（含部门信息）"""
    dept = alloc.department
    return {
        "id": alloc.id,
        "contract_id": alloc.contract_id,
        "department_id": alloc.department_id,
        "department_name": dept.name if dept else None,
        "department_leader": dept.leader if dept else None,
        "amount": float(alloc.amount) if alloc.amount else 0.0,
    }


@router.get("/{contract_id}/allocations", summary="获取合同费用分摊列表")
async def get_cost_allocations(
    contract_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取合同的所有费用分摊记录（含部门信息）"""
    # 验证合同存在（用户隔离）
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id, Contract.user_id == user.id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")

    result = await db.execute(
        select(CostAllocation)
        .where(CostAllocation.contract_id == contract_id)
        .order_by(CostAllocation.id)
    )
    allocations = result.scalars().all()

    return {
        "code": 0,
        "data": [_allocation_to_dict(a) for a in allocations],
        "contract_amount": float(contract.amount) if contract.amount else 0.0,
    }


@router.post("/{contract_id}/allocations", summary="批量保存费用分摊")
async def save_cost_allocations(
    contract_id: int,
    body: CostAllocationBulkSave,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量保存分摊（替换旧数据）。分摊总额必须等于合同金额。"""
    # 验证合同存在（用户隔离）
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id, Contract.user_id == user.id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")

    # 验证：分摊总额必须等于合同金额（四舍五入到2位小数）
    total = sum(
        float(a.amount) if a.amount is not None else 0.0
        for a in body.allocations
    )
    contract_amount = float(contract.amount) if contract.amount else 0.0
    if round(total, 2) != round(contract_amount, 2):
        raise HTTPException(
            status_code=400,
            detail=f"分摊总额（{round(total, 2):.2f}）与合同金额（{round(contract_amount, 2):.2f}）不相等"
        )

    # 验证所有部门ID存在
    dept_ids = list({a.department_id for a in body.allocations})
    dept_result = await db.execute(
        select(DepartmentModel).where(DepartmentModel.id.in_(dept_ids))
    )
    existing_dept_ids = {d.id for d in dept_result.scalars().all()}
    missing = [did for did in dept_ids if did not in existing_dept_ids]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"部门ID不存在: {', '.join(missing)}"
        )

    # 删除旧分摊记录
    await db.execute(
        delete(CostAllocation).where(CostAllocation.contract_id == contract_id)
    )

    # 插入新分摊记录
    for item in body.allocations:
        alloc = CostAllocation(
            contract_id=contract_id,
            department_id=item.department_id,
            amount=float(item.amount) if item.amount is not None else 0.0,
        )
        db.add(alloc)

    await db.commit()

    # 重新查询返回（含部门信息）
    result = await db.execute(
        select(CostAllocation)
        .where(CostAllocation.contract_id == contract_id)
        .order_by(CostAllocation.id)
    )
    saved = result.scalars().all()

    return {
        "code": 0,
        "message": "费用分摊保存成功",
        "data": [_allocation_to_dict(a) for a in saved],
    }


@router.get("/{contract_id}/allocations/summary", summary="获取费用分摊汇总")
async def get_cost_allocation_summary(
    contract_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取费用分摊汇总（面向饼图）。返回各部门金额、占比及是否平衡。"""
    # 验证合同存在（用户隔离）
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id, Contract.user_id == user.id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="合同不存在")

    result = await db.execute(
        select(CostAllocation)
        .where(CostAllocation.contract_id == contract_id)
        .order_by(CostAllocation.id)
    )
    allocations = result.scalars().all()

    contract_amount = float(contract.amount) if contract.amount else 0.0
    total_amount = sum(float(a.amount) if a.amount else 0.0 for a in allocations)

    items = []
    for a in allocations:
        dept = a.department
        amt = float(a.amount) if a.amount else 0.0
        ratio = round(amt / contract_amount * 100, 2) if contract_amount > 0 else 0.0
        items.append({
            "department_id": a.department_id,
            "department_name": dept.name if dept else None,
            "amount": amt,
            "ratio": ratio,
        })

    is_balanced = abs(total_amount - contract_amount) < 0.01

    return {
        "code": 0,
        "data": items,
        "total_amount": total_amount,
        "is_balanced": is_balanced,
    }
