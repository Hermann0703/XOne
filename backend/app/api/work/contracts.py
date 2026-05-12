"""合同管理模块 API — 全宗 / 分类 / 密级 / 合同 / 里程碑 / 仪表盘"""

from datetime import date
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
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
    fonds_id: int = Field(..., gt=0, description="所属全宗ID")
    category_id: int = Field(..., gt=0, description="所属分类ID")
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
        pattern="^(purchase|service|lease|sale|loan|other)$",
        description="合同类型"
    )
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
    lifecycle_id: Optional[int] = Field(default=None, gt=0, description="生命周期模板ID")
    auto_renewal: bool = Field(default=False, description="是否启用自动续约")
    renewal_remind_days: int = Field(default=7, ge=1, le=90, description="续约提醒天数(到期前N天触发)")

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
        pattern="^(purchase|service|lease|sale|loan|other)$",
        description="合同类型"
    )
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
    lifecycle_id: Optional[int] = Field(default=None, gt=0, description="生命周期模板ID")
    auto_renewal: bool = Field(default=False, description="是否启用自动续约")
    renewal_remind_days: int = Field(default=7, ge=1, le=90, description="续约提醒天数(到期前N天触发)")

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


class LifecycleTemplateCreate(BaseModel):
    """创建生命周期模板请求体"""
    name: str = Field(..., min_length=1, max_length=128, description="模板名称")
    description: Optional[str] = Field(default=None, description="描述")
    is_active: bool = Field(default=True, description="是否启用")


class LifecycleTemplateUpdate(BaseModel):
    """更新生命周期模板请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128, description="模板名称")
    description: Optional[str] = Field(default=None, description="描述")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


class LifecycleStageCreate(BaseModel):
    """创建生命周期阶段请求体"""
    name: str = Field(..., min_length=1, max_length=128, description="阶段名称")
    stage_type: str = Field(
        default="custom",
        pattern="^(drafting|review|signing|execution|renewal|termination|archived|custom)$",
        description="阶段类型"
    )
    sort_order: int = Field(default=0, ge=0, description="排序")
    description: Optional[str] = Field(default=None, description="描述")
    color: Optional[str] = Field(default=None, max_length=16, description="颜色")
    is_required: bool = Field(default=True, description="是否必经阶段")
    auto_transition_days: int = Field(default=0, ge=0, description="自动流转天数")


class LifecycleStageUpdate(BaseModel):
    """更新生命周期阶段请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128, description="阶段名称")
    stage_type: Optional[str] = Field(
        default=None,
        pattern="^(drafting|review|signing|execution|renewal|termination|archived|custom)$",
        description="阶段类型"
    )
    sort_order: Optional[int] = Field(default=None, ge=0, description="排序")
    description: Optional[str] = Field(default=None, description="描述")
    color: Optional[str] = Field(default=None, max_length=16, description="颜色")
    is_required: Optional[bool] = Field(default=None, description="是否必经阶段")
    auto_transition_days: Optional[int] = Field(default=None, ge=0, description="自动流转天数")


class StageReorderRequest(BaseModel):
    """重排阶段请求体"""
    stage_ids: list[int] = Field(..., min_length=1, description="阶段ID列表（按新顺序排列）")


class AdvanceStageRequest(BaseModel):
    """推进阶段请求体"""
    notes: Optional[str] = Field(default=None, description="备注")


class SupplierCreate(BaseModel):
    """创建供应商请求体"""
    name: str = Field(..., min_length=1, max_length=256, description="供应商名称")
    contact_person: Optional[str] = Field(default=None, max_length=128, description="联系人")
    contact_phone: Optional[str] = Field(default=None, max_length=32, description="联系电话")
    address: Optional[str] = Field(default=None, max_length=512, description="地址")
    business_license: Optional[str] = Field(default=None, max_length=128, description="营业执照号")
    tax_id: Optional[str] = Field(default=None, max_length=64, description="税号")
    bank_name: Optional[str] = Field(default=None, max_length=256, description="开户银行")
    bank_account: Optional[str] = Field(default=None, max_length=64, description="银行账号")
    dc_bank_name: Optional[str] = Field(default=None, max_length=256, description="数字人民币开户行")
    dc_bank_account: Optional[str] = Field(default=None, max_length=64, description="数字人民币账号")
    rating: Optional[str] = Field(default=None, max_length=32, description="评级")
    status: Optional[str] = Field(default="active", max_length=32, description="状态: active/inactive")
    notes: Optional[str] = Field(default=None, description="备注")


class SupplierUpdate(BaseModel):
    """更新供应商请求体"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=256, description="供应商名称")
    contact_person: Optional[str] = Field(default=None, max_length=128, description="联系人")
    contact_phone: Optional[str] = Field(default=None, max_length=32, description="联系电话")
    address: Optional[str] = Field(default=None, max_length=512, description="地址")
    business_license: Optional[str] = Field(default=None, max_length=128, description="营业执照号")
    tax_id: Optional[str] = Field(default=None, max_length=64, description="税号")
    bank_name: Optional[str] = Field(default=None, max_length=256, description="开户银行")
    bank_account: Optional[str] = Field(default=None, max_length=64, description="银行账号")
    dc_bank_name: Optional[str] = Field(default=None, max_length=256, description="数字人民币开户行")
    dc_bank_account: Optional[str] = Field(default=None, max_length=64, description="数字人民币账号")
    rating: Optional[str] = Field(default=None, max_length=32, description="评级")
    status: Optional[str] = Field(default=None, max_length=32, description="状态")
    notes: Optional[str] = Field(default=None, description="备注")


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
        "requirement_no": ct.requirement_no,
        "subject_no": ct.subject_no,
        "procurement_no": ct.procurement_no,
        "subject_name": ct.subject_name,
        "description": ct.description,
        "keywords": ct.keywords,
        "created_at": ct.created_at.isoformat() if ct.created_at else None,
        "updated_at": ct.updated_at.isoformat() if ct.updated_at else None,
        "fonds": _safe_fonds_to_dict(ct.fonds) if hasattr(ct, "fonds") and ct.fonds else None,
        "category": _safe_category_to_dict(ct.category) if hasattr(ct, "category") and ct.category else None,
        "classification": _classification_to_dict(ct.classification) if hasattr(ct, "classification") and ct.classification else None,
        "lifecycle_id": ct.lifecycle_id,
        "lifecycle_stage_id": ct.lifecycle_stage_id,
        "lifecycle_stage_name": ct.lifecycle_stage.name if ct.lifecycle_stage else None,
        "lifecycle_template_name": ct.lifecycle.name if ct.lifecycle else None,
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


def _supplier_to_dict(s) -> dict:
    return {
        "id": str(s.id),
        "user_id": str(s.user_id) if s.user_id else None,
        "name": s.name,
        "contact_person": s.contact_person,
        "contact_phone": s.contact_phone,
        "address": s.address,
        "business_license": s.business_license,
        "tax_id": s.tax_id,
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


@router.get("/classifications", summary="获取密级列表")
async def get_classifications_list(
    db: AsyncSession = Depends(get_db),
):
    """获取所有密级"""
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
    contract_type: Optional[str] = Query(default=None, description="按类型筛选"),
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
    contract = await contract_service.create_contract(db, current_user.id, body.model_dump())
    return {
        "code": 0,
        "message": "合同创建成功",
        "data": _contract_to_dict(contract),
    }



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
        user_id=current_user.id,
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
#  生命周期模板端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/lifecycle/templates", summary="获取生命周期模板列表")
async def get_lifecycle_templates(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的所有生命周期模板"""
    items = await contract_service.list_lifecycle_templates(db, user.id)
    return {
        "code": 0, "message": "查询成功",
        "data": [contract_service._lifecycle_template_to_dict(t) for t in items],
    }


@router.post("/lifecycle/templates", summary="创建生命周期模板")
async def create_lifecycle_template_endpoint(
    body: LifecycleTemplateCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的生命周期模板"""
    template = await contract_service.create_lifecycle_template(db, user.id, body.model_dump())
    return {
        "code": 0, "message": "模板创建成功",
        "data": contract_service._lifecycle_template_to_dict(template),
    }


@router.get("/lifecycle/templates/{template_id}", summary="获取模板详情")
async def get_lifecycle_template_endpoint(
    template_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个生命周期模板详情（含阶段列表）"""
    template = await contract_service.get_lifecycle_template(db, template_id, user.id)
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {
        "code": 0, "message": "查询成功",
        "data": contract_service._lifecycle_template_to_dict(template),
    }


@router.patch("/lifecycle/templates/{template_id}", summary="更新模板")
async def update_lifecycle_template_endpoint(
    template_id: int,
    body: LifecycleTemplateUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新生命周期模板"""
    template = await contract_service.update_lifecycle_template(
        db, template_id, user.id, body.model_dump(exclude_none=True)
    )
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {
        "code": 0, "message": "模板更新成功",
        "data": contract_service._lifecycle_template_to_dict(template),
    }


@router.delete("/lifecycle/templates/{template_id}", summary="删除模板")
async def delete_lifecycle_template_endpoint(
    template_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除生命周期模板（级联删除阶段）"""
    success = await contract_service.delete_lifecycle_template(db, template_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {"code": 0, "message": "模板删除成功", "data": None}


# ═══════════════════════════════════════════════════════════════════════
#  生命周期阶段端点
# ═══════════════════════════════════════════════════════════════════════


@router.post("/lifecycle/templates/{template_id}/stages", summary="添加阶段")
async def add_lifecycle_stage_endpoint(
    template_id: int,
    body: LifecycleStageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """为模板添加生命周期阶段"""
    stage = await contract_service.add_lifecycle_stage(
        db, template_id, user.id, body.model_dump()
    )
    if not stage:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {
        "code": 0, "message": "阶段添加成功",
        "data": contract_service._lifecycle_stage_to_dict(stage),
    }


@router.patch("/lifecycle/templates/{template_id}/stages/{stage_id}", summary="更新阶段")
async def update_lifecycle_stage_endpoint(
    template_id: int,
    stage_id: int,
    body: LifecycleStageUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新生命周期阶段"""
    stage = await contract_service.update_lifecycle_stage(
        db, stage_id, user.id, body.model_dump(exclude_none=True)
    )
    if not stage:
        raise HTTPException(status_code=404, detail="阶段不存在")
    return {
        "code": 0, "message": "阶段更新成功",
        "data": contract_service._lifecycle_stage_to_dict(stage),
    }


@router.delete("/lifecycle/templates/{template_id}/stages/{stage_id}", summary="删除阶段")
async def delete_lifecycle_stage_endpoint(
    template_id: int,
    stage_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除生命周期阶段"""
    success = await contract_service.delete_lifecycle_stage(db, stage_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="阶段不存在")
    return {"code": 0, "message": "阶段删除成功", "data": None}


@router.put("/lifecycle/templates/{template_id}/stages/reorder", summary="重排阶段")
async def reorder_lifecycle_stages_endpoint(
    template_id: int,
    body: StageReorderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """重排生命周期阶段顺序"""
    success = await contract_service.reorder_lifecycle_stages(
        db, template_id, user.id, body.stage_ids
    )
    if not success:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {"code": 0, "message": "排序更新成功", "data": None}


# ═══════════════════════════════════════════════════════════════════════
#  合同生命周期流转端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/{contract_id}/lifecycle", summary="查看合同生命周期")
async def get_contract_lifecycle_endpoint(
    contract_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """查看合同的当前生命周期状态"""
    data = await contract_service.get_contract_lifecycle(db, contract_id, user.id)
    if data is None:
        raise HTTPException(status_code=404, detail="合同不存在")
    return {"code": 0, "message": "查询成功", "data": data}


@router.post("/{contract_id}/lifecycle/advance", summary="推进阶段")
async def advance_contract_stage_endpoint(
    contract_id: int,
    body: Optional[AdvanceStageRequest] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """推进合同到下一生命周期阶段"""
    result = await contract_service.advance_contract_stage(
        db, contract_id, user.id, user.id,
        notes=body.notes if body else None,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="合同不存在或未绑定生命周期")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["message"])
    return {"code": 0, "message": "阶段推进成功", "data": result}


@router.get("/{contract_id}/lifecycle/history", summary="流转历史")
async def get_contract_stage_history_endpoint(
    contract_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取合同阶段流转历史记录"""
    logs = await contract_service.get_contract_stage_history(db, contract_id, user.id)
    return {
        "code": 0, "message": "查询成功",
        "data": [contract_service._stage_log_to_dict(l) for l in logs],
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

