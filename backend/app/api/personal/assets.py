"""资产模块 API — 账户 / 交易 / 仪表盘 / 统计"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import asset_service

router = APIRouter(prefix="/assets", tags=["个人-资产"])


# ── Pydantic Schemas ──────────────────────────────────────────────────


class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128, description="账户名称")
    type: str = Field(default="other", pattern="^(bank|cash|credit|investment|other)$", description="账户类型")
    balance: float = Field(default=0.0, description="初始余额")
    currency: str = Field(default="CNY", description="货币代码")
    institution: Optional[str] = Field(default=None, max_length=128, description="金融机构")
    icon: Optional[str] = Field(default=None, max_length=64, description="图标")
    color: Optional[str] = Field(default=None, max_length=32, description="颜色标识")
    is_active: bool = Field(default=True, description="是否启用")


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=128, description="账户名称")
    type: Optional[str] = Field(default=None, pattern="^(bank|cash|credit|investment|other)$", description="账户类型")
    balance: Optional[float] = Field(default=None, description="余额")
    currency: Optional[str] = Field(default=None, description="货币代码")
    institution: Optional[str] = Field(default=None, max_length=128, description="金融机构")
    icon: Optional[str] = Field(default=None, max_length=64, description="图标")
    color: Optional[str] = Field(default=None, max_length=32, description="颜色标识")
    is_active: Optional[bool] = Field(default=None, description="是否启用")


class TransactionCreate(BaseModel):
    account_id: int = Field(..., gt=0, description="关联账户ID")
    type: str = Field(..., pattern="^(income|expense|transfer)$", description="交易类型")
    amount: float = Field(..., gt=0, description="金额")
    category: str = Field(
        default="other",
        pattern="^(food|transport|shopping|entertainment|housing|health|education|investment|salary|other)$",
        description="交易分类",
    )
    description: Optional[str] = Field(default=None, max_length=256, description="备注")
    transaction_date: Optional[date] = Field(default=None, description="交易日期")
    tags: Optional[str] = Field(default=None, description="标签（逗号分隔）")
    target_account_id: Optional[int] = Field(default=None, gt=0, description="转账目标账户ID")


# ── 辅助函数 ──────────────────────────────────────────────────────────

def _account_to_dict(acct) -> dict:
    return {
        "id": acct.id,
        "user_id": acct.user_id,
        "name": acct.name,
        "type": acct.type,
        "balance": acct.balance,
        "currency": acct.currency,
        "institution": acct.institution,
        "icon": acct.icon,
        "color": acct.color,
        "is_active": acct.is_active,
        "created_at": acct.created_at.isoformat() if acct.created_at else None,
        "updated_at": acct.updated_at.isoformat() if acct.updated_at else None,
    }


def _txn_to_dict(txn) -> dict:
    return {
        "id": txn.id,
        "user_id": txn.user_id,
        "account_id": txn.account_id,
        "type": txn.type,
        "amount": txn.amount,
        "category": txn.category,
        "description": txn.description,
        "transaction_date": txn.transaction_date.isoformat() if txn.transaction_date else None,
        "tags": txn.tags,
        "target_account_id": txn.target_account_id,
        "created_at": txn.created_at.isoformat() if txn.created_at else None,
        "updated_at": txn.updated_at.isoformat() if txn.updated_at else None,
        "account": _account_to_dict(txn.account) if hasattr(txn, "account") and txn.account else None,
    }


def _dashboard_txns(txns) -> list:
    result = []
    for txn in txns:
        result.append({
            "id": txn.id,
            "type": txn.type,
            "amount": txn.amount,
            "category": txn.category,
            "description": txn.description,
            "transaction_date": txn.transaction_date.isoformat() if txn.transaction_date else None,
            "account_name": txn.account.name if hasattr(txn, "account") and txn.account else None,
        })
    return result


# ── 账户端点 ──────────────────────────────────────────────────────────


@router.get("/accounts", summary="获取账户列表")
async def get_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的所有资产账户"""
    accounts = await asset_service.list_accounts(db, current_user.id)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [_account_to_dict(a) for a in accounts],
    }


@router.post("/accounts", summary="创建账户")
async def create_account(
    body: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的资产账户"""
    account = await asset_service.create_account(db, current_user.id, body.model_dump(exclude_none=True))
    return {
        "code": 0,
        "message": "账户创建成功",
        "data": _account_to_dict(account),
    }


@router.get("/accounts/{account_id}", summary="获取账户详情")
async def get_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个账户详情"""
    accounts = await asset_service.list_accounts(db, current_user.id)
    account = next((a for a in accounts if a.id == account_id), None)
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": _account_to_dict(account),
    }


@router.patch("/accounts/{account_id}", summary="更新账户")
async def update_account(
    account_id: int,
    body: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新账户信息"""
    account = await asset_service.update_account(
        db, account_id, current_user.id, body.model_dump(exclude_none=True)
    )
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")
    return {
        "code": 0,
        "message": "账户更新成功",
        "data": _account_to_dict(account),
    }


@router.delete("/accounts/{account_id}", summary="删除账户")
async def delete_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除账户（同时删除关联交易）"""
    success = await asset_service.delete_account(db, account_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="账户不存在")
    return {
        "code": 0,
        "message": "账户删除成功",
        "data": None,
    }


# ── 交易端点 ──────────────────────────────────────────────────────────


@router.get("/transactions", summary="获取交易列表")
async def get_transactions(
    current_user: User = Depends(get_current_user),
    page: int = Query(default=1, ge=1, description="页码"),
    size: int = Query(default=20, ge=1, le=100, description="每页条数"),
    account_id: Optional[int] = Query(default=None, description="筛选账户ID"),
    type: Optional[str] = Query(default=None, description="筛选交易类型"),
    category: Optional[str] = Query(default=None, description="筛选分类"),
    date_from: Optional[date] = Query(default=None, description="开始日期"),
    date_to: Optional[date] = Query(default=None, description="结束日期"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询交易记录，支持多条件筛选"""
    result = await asset_service.list_transactions(
        db,
        user_id=current_user.id,
        page=page,
        size=size,
        account_id=account_id,
        transaction_type=type,
        category=category,
        date_from=date_from,
        date_to=date_to,
    )
    return {
        "code": 0,
        "message": "查询成功",
        "data": {
            "items": [_txn_to_dict(t) for t in result["items"]],
            "total": result["total"],
            "page": page,
            "size": size,
        },
    }


@router.post("/transactions", summary="创建交易")
async def create_transaction(
    body: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建交易记录并自动更新账户余额"""
    try:
        txn = await asset_service.create_transaction(
            db, current_user.id, body.model_dump(exclude_none=True)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "code": 0,
        "message": "交易创建成功",
        "data": _txn_to_dict(txn),
    }


# ── 仪表盘 / 统计 ────────────────────────────────────────────────────


@router.get("/dashboard", summary="仪表盘")
async def dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取资产仪表盘聚合数据"""
    data = await asset_service.get_dashboard(db, current_user.id)
    # 替换 recent_transactions 为可序列化格式
    data["recent_transactions"] = _dashboard_txns(data["recent_transactions"])
    return {
        "code": 0,
        "message": "查询成功",
        "data": data,
    }


@router.get("/stats", summary="月度统计")
async def stats(
    current_user: User = Depends(get_current_user),
    year: int = Query(..., description="年份"),
    month: int = Query(..., ge=1, le=12, description="月份"),
    db: AsyncSession = Depends(get_db),
):
    """获取指定月份的收支分类统计"""
    data = await asset_service.get_stats(db, current_user.id, year, month)
    return {
        "code": 0,
        "message": "查询成功",
        "data": data,
    }
