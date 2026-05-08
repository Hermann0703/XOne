"""购物模块 API — 预算 / 购物项 / 仪表盘"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services import shopping_service

router = APIRouter(prefix="/shopping", tags=["个人-购物"])


# ── Pydantic Schemas ──────────────────────────────────────────────────


class BudgetCreate(BaseModel):
    """创建预算请求体"""
    name: str = Field(..., min_length=1, max_length=128, description="预算名称")
    amount: float = Field(..., gt=0, description="预算金额")
    category: str = Field(..., min_length=1, max_length=64, description="预算分类")
    period: str = Field(default="monthly", pattern="^(monthly|weekly|yearly)$", description="周期")
    start_date: date = Field(..., description="开始日期")
    end_date: Optional[date] = Field(default=None, description="结束日期")
    notes: Optional[str] = Field(default=None, description="备注")
    is_active: bool = Field(default=True, description="是否启用")


class BudgetUpdate(BaseModel):
    """更新预算请求体（全部字段可选）"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=128, description="预算名称")
    amount: Optional[float] = Field(default=None, gt=0, description="预算金额")
    category: Optional[str] = Field(default=None, min_length=1, max_length=64, description="预算分类")
    period: Optional[str] = Field(default=None, pattern="^(monthly|weekly|yearly)$", description="周期")
    start_date: Optional[date] = Field(default=None, description="开始日期")
    end_date: Optional[date] = Field(default=None, description="结束日期")
    notes: Optional[str] = Field(default=None, description="备注")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


class ItemCreate(BaseModel):
    """创建购物项请求体"""
    name: str = Field(..., min_length=1, max_length=256, description="物品名称")
    category: str = Field(..., min_length=1, max_length=64, description="物品分类")
    price: Optional[float] = Field(default=None, ge=0, description="预估价格")
    quantity: int = Field(default=1, ge=1, description="数量")
    priority: str = Field(default="medium", pattern="^(low|medium|high)$", description="优先级")
    status: str = Field(default="pending", pattern="^(pending|purchased|cancelled)$", description="状态")
    store: Optional[str] = Field(default=None, max_length=128, description="购买商家")
    url: Optional[str] = Field(default=None, description="商品链接")
    notes: Optional[str] = Field(default=None, description="备注")
    budget_id: Optional[int] = Field(default=None, gt=0, description="关联预算ID")
    created_date: Optional[date] = Field(default=None, description="创建日期")
    purchased_date: Optional[date] = Field(default=None, description="购买日期")


class ItemUpdate(BaseModel):
    """更新购物项请求体（全部字段可选）"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=256, description="物品名称")
    category: Optional[str] = Field(default=None, min_length=1, max_length=64, description="物品分类")
    price: Optional[float] = Field(default=None, ge=0, description="预估价格")
    quantity: Optional[int] = Field(default=None, ge=1, description="数量")
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high)$", description="优先级")
    status: Optional[str] = Field(default=None, pattern="^(pending|purchased|cancelled)$", description="状态")
    store: Optional[str] = Field(default=None, max_length=128, description="购买商家")
    url: Optional[str] = Field(default=None, description="商品链接")
    notes: Optional[str] = Field(default=None, description="备注")
    budget_id: Optional[int] = Field(default=None, gt=0, description="关联预算ID")
    created_date: Optional[date] = Field(default=None, description="创建日期")
    purchased_date: Optional[date] = Field(default=None, description="购买日期")


# ── 辅助函数 ──────────────────────────────────────────────────────────


def _budget_to_dict(b) -> dict:
    return {
        "id": b.id,
        "user_id": b.user_id,
        "name": b.name,
        "amount": b.amount,
        "category": b.category,
        "period": b.period,
        "start_date": b.start_date.isoformat() if b.start_date else None,
        "end_date": b.end_date.isoformat() if b.end_date else None,
        "notes": b.notes,
        "is_active": b.is_active,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


def _item_to_dict(item) -> dict:
    return {
        "id": item.id,
        "user_id": item.user_id,
        "name": item.name,
        "category": item.category,
        "price": item.price,
        "quantity": item.quantity,
        "priority": item.priority,
        "status": item.status,
        "store": item.store,
        "url": item.url,
        "notes": item.notes,
        "budget_id": item.budget_id,
        "created_date": item.created_date.isoformat() if item.created_date else None,
        "purchased_date": item.purchased_date.isoformat() if item.purchased_date else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        "budget": _budget_to_dict(item.budget) if hasattr(item, "budget") and item.budget else None,
    }


# ── 预算端点 ──────────────────────────────────────────────────────────


@router.get("/budgets", summary="获取预算列表")
async def get_budgets(
    user_id: int = Query(..., gt=0, description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的所有预算"""
    budgets = await shopping_service.list_budgets(db, user_id)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_budget_to_dict(b) for b in budgets],
    }


@router.post("/budgets", summary="创建预算")
async def create_budget(
    body: BudgetCreate,
    user_id: int = Query(..., gt=0, description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """创建新的预算"""
    budget = await shopping_service.create_budget(db, user_id, body.model_dump())
    return {
        "code": 0,
        "message": "预算创建成功",
        "data": _budget_to_dict(budget),
    }


@router.get("/budgets/{budget_id}", summary="获取预算详情")
async def get_budget(
    budget_id: int,
    user_id: int = Query(..., gt=0, description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """获取单个预算详情"""
    budget = await shopping_service.get_budget(db, budget_id, user_id)
    if not budget:
        raise HTTPException(status_code=404, detail="预算不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": _budget_to_dict(budget),
    }


@router.patch("/budgets/{budget_id}", summary="更新预算")
async def update_budget(
    budget_id: int,
    body: BudgetUpdate,
    user_id: int = Query(..., gt=0, description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """更新预算信息"""
    budget = await shopping_service.update_budget(
        db, budget_id, user_id, body.model_dump(exclude_none=True)
    )
    if not budget:
        raise HTTPException(status_code=404, detail="预算不存在")
    return {
        "code": 0,
        "message": "预算更新成功",
        "data": _budget_to_dict(budget),
    }


@router.delete("/budgets/{budget_id}", summary="删除预算")
async def delete_budget(
    budget_id: int,
    user_id: int = Query(..., gt=0, description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """删除预算（关联购物项的 budget_id 将置空）"""
    success = await shopping_service.delete_budget(db, budget_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="预算不存在")
    return {
        "code": 0,
        "message": "预算删除成功",
        "data": None,
    }


# ── 购物项端点 ────────────────────────────────────────────────────────


@router.get("/items", summary="获取购物清单")
async def get_items(
    user_id: int = Query(..., gt=0, description="用户ID"),
    status: Optional[str] = Query(default=None, description="筛选状态: pending/purchased/cancelled"),
    category: Optional[str] = Query(default=None, description="筛选分类"),
    priority: Optional[str] = Query(default=None, description="筛选优先级: low/medium/high"),
    budget_id: Optional[int] = Query(default=None, description="筛选预算ID"),
    db: AsyncSession = Depends(get_db),
):
    """获取购物清单，支持按状态、分类、优先级、预算筛选"""
    items = await shopping_service.list_items(
        db, user_id, status=status, category=category,
        priority=priority, budget_id=budget_id,
    )
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_item_to_dict(item) for item in items],
    }


@router.post("/items", summary="创建购物项")
async def create_item(
    body: ItemCreate,
    user_id: int = Query(..., gt=0, description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """添加新的购物项"""
    item = await shopping_service.create_item(db, user_id, body.model_dump())
    return {
        "code": 0,
        "message": "购物项添加成功",
        "data": _item_to_dict(item),
    }


@router.get("/items/{item_id}", summary="获取购物项详情")
async def get_item(
    item_id: int,
    user_id: int = Query(..., gt=0, description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """获取单个购物项详情"""
    item = await shopping_service.get_item(db, item_id, user_id)
    if not item:
        raise HTTPException(status_code=404, detail="购物项不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": _item_to_dict(item),
    }


@router.patch("/items/{item_id}", summary="更新购物项")
async def update_item(
    item_id: int,
    body: ItemUpdate,
    user_id: int = Query(..., gt=0, description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """更新购物项信息"""
    item = await shopping_service.update_item(
        db, item_id, user_id, body.model_dump(exclude_none=True)
    )
    if not item:
        raise HTTPException(status_code=404, detail="购物项不存在")
    return {
        "code": 0,
        "message": "购物项更新成功",
        "data": _item_to_dict(item),
    }


@router.delete("/items/{item_id}", summary="删除购物项")
async def delete_item(
    item_id: int,
    user_id: int = Query(..., gt=0, description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """删除购物项"""
    success = await shopping_service.delete_item(db, item_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="购物项不存在")
    return {
        "code": 0,
        "message": "购物项删除成功",
        "data": None,
    }


# ── 仪表盘 ────────────────────────────────────────────────────────────


@router.get("/dashboard", summary="购物仪表盘")
async def dashboard(
    user_id: int = Query(..., gt=0, description="用户ID"),
    db: AsyncSession = Depends(get_db),
):
    """获取购物仪表盘聚合数据"""
    data = await shopping_service.get_dashboard(db, user_id)
    # 替换 recent_purchases 为可序列化格式
    data["recent_purchases"] = [
        _item_to_dict(item) for item in data["recent_purchases"]
    ]
    return {
        "code": 0,
        "message": "查询成功",
        "data": data,
    }
