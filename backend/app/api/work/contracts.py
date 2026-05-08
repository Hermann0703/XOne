"""合同管理模块 API — 全宗 / 分类 / 密级 / 合同 / 里程碑 / 仪表盘"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import contract_service

router = APIRouter(prefix="/contracts", tags=["工作-合同"])


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
    title: str = Field(..., min_length=1, max_length=256, description="合同标题")
    fonds_id: int = Field(..., gt=0, description="所属全宗ID")
    category_id: int = Field(..., gt=0, description="所属分类ID")
    classification_id: int = Field(..., gt=0, description="密级ID")
    party_a: str = Field(..., min_length=1, max_length=256, description="甲方")
    party_b: str = Field(..., min_length=1, max_length=256, description="乙方")
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
        pattern="^(purchase|service|lease|loan|other)$",
        description="合同类型"
    )
    description: Optional[str] = Field(default=None, description="描述")
    keywords: Optional[str] = Field(default=None, max_length=512, description="关键词")


class ContractUpdate(BaseModel):
    """更新合同请求体"""
    contract_no: Optional[str] = Field(default=None, min_length=1, max_length=64, description="合同编号")
    title: Optional[str] = Field(default=None, min_length=1, max_length=256, description="合同标题")
    fonds_id: Optional[int] = Field(default=None, gt=0, description="所属全宗ID")
    category_id: Optional[int] = Field(default=None, gt=0, description="所属分类ID")
    classification_id: Optional[int] = Field(default=None, gt=0, description="密级ID")
    party_a: Optional[str] = Field(default=None, min_length=1, max_length=256, description="甲方")
    party_b: Optional[str] = Field(default=None, min_length=1, max_length=256, description="乙方")
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
        pattern="^(purchase|service|lease|loan|other)$",
        description="合同类型"
    )
    description: Optional[str] = Field(default=None, description="描述")
    keywords: Optional[str] = Field(default=None, max_length=512, description="关键词")


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


# ── 辅助序列化函数 ────────────────────────────────────────────────────


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
        "fonds": _fonds_to_dict(c.fonds) if hasattr(c, "fonds") and c.fonds else None,
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
        "title": ct.title,
        "fonds_id": ct.fonds_id,
        "category_id": ct.category_id,
        "classification_id": ct.classification_id,
        "party_a": ct.party_a,
        "party_b": ct.party_b,
        "amount": ct.amount,
        "currency": ct.currency,
        "sign_date": ct.sign_date.isoformat() if ct.sign_date else None,
        "start_date": ct.start_date.isoformat() if ct.start_date else None,
        "end_date": ct.end_date.isoformat() if ct.end_date else None,
        "status": ct.status,
        "contract_type": ct.contract_type,
        "description": ct.description,
        "keywords": ct.keywords,
        "created_at": ct.created_at.isoformat() if ct.created_at else None,
        "updated_at": ct.updated_at.isoformat() if ct.updated_at else None,
        "fonds": _fonds_to_dict(ct.fonds) if hasattr(ct, "fonds") and ct.fonds else None,
        "category": _category_to_dict(ct.category) if hasattr(ct, "category") and ct.category else None,
        "classification": _classification_to_dict(ct.classification) if hasattr(ct, "classification") and ct.classification else None,
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


@router.get("/contracts", summary="获取合同列表")
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


@router.post("/contracts", summary="创建合同")
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


@router.get("/contracts/{contract_id}", summary="获取合同详情")
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


@router.patch("/contracts/{contract_id}", summary="更新合同")
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


@router.delete("/contracts/{contract_id}", summary="删除合同")
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


@router.get("/contracts/{contract_id}/milestones", summary="获取合同里程碑列表")
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


@router.post("/contracts/{contract_id}/milestones", summary="创建里程碑")
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
