"""资产模块服务层 — 账户 & 交易业务逻辑"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_, case, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assets import Account, Transaction


# ── 账户 ──────────────────────────────────────────────────────────────

async def list_accounts(db: AsyncSession, user_id: UUID) -> list[Account]:
    """获取用户所有账户"""
    stmt = (
        select(Account)
        .where(Account.user_id == user_id)
        .order_by(Account.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_account(db: AsyncSession, user_id: UUID, data: dict) -> Account:
    """创建账户"""
    account = Account(
        user_id=user_id,
        name=data["name"],
        type=data.get("type", "other"),
        balance=data.get("balance", 0.0),
        currency=data.get("currency", "CNY"),
        institution=data.get("institution"),
        icon=data.get("icon"),
        color=data.get("color"),
        is_active=data.get("is_active", True),
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


async def update_account(
    db: AsyncSession, account_id: int, user_id: UUID, data: dict
) -> Optional[Account]:
    """更新账户（仅允许修改 name/type/institution/icon/color/is_active/balance）"""
    stmt = select(Account).where(
        Account.id == account_id, Account.user_id == user_id
    )
    result = await db.execute(stmt)
    account = result.scalar_one_or_none()
    if not account:
        return None

    for field in ("name", "type", "balance", "currency", "institution", "icon", "color", "is_active"):
        if field in data:
            setattr(account, field, data[field])

    await db.flush()
    await db.refresh(account)
    return account


async def delete_account(
    db: AsyncSession, account_id: int, user_id: UUID
) -> bool:
    """删除账户（同时级联删除关联交易）"""
    stmt = select(Account).where(
        Account.id == account_id, Account.user_id == user_id
    )
    result = await db.execute(stmt)
    account = result.scalar_one_or_none()
    if not account:
        return False

    await db.delete(account)
    await db.flush()
    return True


# ── 交易 ──────────────────────────────────────────────────────────────

async def list_transactions(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    size: int = 20,
    account_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> dict:
    """分页查询交易记录，支持多条件筛选"""
    conditions = [Transaction.user_id == user_id]

    if account_id is not None:
        conditions.append(Transaction.account_id == account_id)
    if transaction_type is not None:
        conditions.append(Transaction.type == transaction_type)
    if category is not None:
        conditions.append(Transaction.category == category)
    if date_from is not None:
        conditions.append(Transaction.transaction_date >= date_from)
    if date_to is not None:
        conditions.append(Transaction.transaction_date <= date_to)

    base_where = and_(*conditions)

    # 总数
    count_stmt = select(func.count()).select_from(Transaction).where(base_where)
    total = (await db.execute(count_stmt)).scalar() or 0

    # 分页列表
    stmt = (
        select(Transaction)
        .where(base_where)
        .options(selectinload(Transaction.account))
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return {"items": items, "total": total}


async def create_transaction(
    db: AsyncSession, user_id: UUID, data: dict
) -> Transaction:
    """创建交易，并自动更新账户余额"""
    txn = Transaction(
        user_id=user_id,
        account_id=data["account_id"],
        type=data["type"],
        amount=data["amount"],
        category=data.get("category", "other"),
        description=data.get("description"),
        transaction_date=data.get("transaction_date", date.today()),
        tags=data.get("tags"),
        target_account_id=data.get("target_account_id"),
    )
    db.add(txn)

    # 查询关联账户
    stmt = select(Account).where(
        Account.id == data["account_id"], Account.user_id == user_id
    )
    result = await db.execute(stmt)
    account = result.scalar_one_or_none()
    if not account:
        raise ValueError("账户不存在")

    if data["type"] == "income":
        account.balance += data["amount"]
    elif data["type"] == "expense":
        account.balance -= data["amount"]
    elif data["type"] == "transfer":
        account.balance -= data["amount"]
        target_id = data.get("target_account_id")
        if target_id:
            target_stmt = select(Account).where(
                Account.id == target_id, Account.user_id == user_id
            )
            target_result = await db.execute(target_stmt)
            target_account = target_result.scalar_one_or_none()
            if target_account:
                target_account.balance += data["amount"]

    await db.flush()
    # 重新查询以加载所有标量列（onupdate 后过期）和 account 关联
    stmt = (
        select(Transaction)
        .where(Transaction.id == txn.id)
        .options(selectinload(Transaction.account))
    )
    result = await db.execute(stmt)
    txn = result.scalar_one()
    return txn


# ── 仪表盘 ────────────────────────────────────────────────────────────

async def get_dashboard(db: AsyncSession, user_id: UUID) -> dict:
    """聚合仪表盘数据"""
    today = date.today()
    current_month = today.month
    current_year = today.year

    # 总余额（净资产）
    net_worth_stmt = select(func.coalesce(func.sum(Account.balance), 0.0)).where(
        Account.user_id == user_id, Account.is_active == True
    )
    net_worth = (await db.execute(net_worth_stmt)).scalar() or 0.0

    # 本月收入 / 支出
    month_income_stmt = select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
        Transaction.user_id == user_id,
        Transaction.type == "income",
        extract("year", Transaction.transaction_date) == current_year,
        extract("month", Transaction.transaction_date) == current_month,
    )
    month_expense_stmt = select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
        Transaction.user_id == user_id,
        Transaction.type == "expense",
        extract("year", Transaction.transaction_date) == current_year,
        extract("month", Transaction.transaction_date) == current_month,
    )

    total_income = (await db.execute(month_income_stmt)).scalar() or 0.0
    total_expense = (await db.execute(month_expense_stmt)).scalar() or 0.0
    monthly_balance = total_income - total_expense

    # 账户明细
    acct_stmt = (
        select(Account.name, Account.balance, Account.color)
        .where(Account.user_id == user_id, Account.is_active == True)
        .order_by(Account.balance.desc())
    )
    acct_result = await db.execute(acct_stmt)
    account_breakdown = [
        {"name": row.name, "balance": float(row.balance), "color": row.color or "#6366f1"}
        for row in acct_result.all()
    ]

    # 本月支出分类
    cat_stmt = (
        select(Transaction.category, func.coalesce(func.sum(Transaction.amount), 0.0).label("total"))
        .where(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            extract("year", Transaction.transaction_date) == current_year,
            extract("month", Transaction.transaction_date) == current_month,
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    cat_result = await db.execute(cat_stmt)
    category_breakdown = [
        {"category": row.category, "amount": float(row.total)}
        for row in cat_result.all()
    ]

    # 最近 10 笔交易
    recent_stmt = (
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .options(selectinload(Transaction.account))
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .limit(10)
    )
    recent_result = await db.execute(recent_stmt)
    recent_transactions = list(recent_result.scalars().all())

    # 最近 6 个月趋势
    monthly_trend = await _monthly_trend(db, user_id)

    return {
        "net_worth": float(net_worth),
        "total_income": float(total_income),
        "total_expense": float(total_expense),
        "monthly_balance": float(monthly_balance),
        "account_breakdown": account_breakdown,
        "category_breakdown": category_breakdown,
        "recent_transactions": recent_transactions,
        "monthly_trend": monthly_trend,
    }


async def _monthly_trend(db: AsyncSession, user_id: UUID) -> list[dict]:
    """计算最近 6 个月的收入/支出/结余趋势"""
    today = date.today()
    months = []
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    trend = []
    for y, m in months:
        income_val = await _month_sum(db, user_id, y, m, "income")
        expense_val = await _month_sum(db, user_id, y, m, "expense")
        trend.append({
            "year": y,
            "month": m,
            "income": float(income_val),
            "expense": float(expense_val),
            "balance": float(income_val - expense_val),
        })
    return trend


async def _month_sum(
    db: AsyncSession, user_id: UUID, year: int, month: int, txn_type: str
) -> float:
    stmt = select(func.coalesce(func.sum(Transaction.amount), 0.0)).where(
        Transaction.user_id == user_id,
        Transaction.type == txn_type,
        extract("year", Transaction.transaction_date) == year,
        extract("month", Transaction.transaction_date) == month,
    )
    return (await db.execute(stmt)).scalar() or 0.0


# ── 统计 ──────────────────────────────────────────────────────────────

async def get_stats(
    db: AsyncSession, user_id: UUID, year: int, month: int
) -> dict:
    """月度分类统计"""
    # 收入分类
    income_stmt = (
        select(Transaction.category, func.coalesce(func.sum(Transaction.amount), 0.0).label("total"))
        .where(
            Transaction.user_id == user_id,
            Transaction.type == "income",
            extract("year", Transaction.transaction_date) == year,
            extract("month", Transaction.transaction_date) == month,
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    income_result = await db.execute(income_stmt)
    income_by_category = [
        {"category": row.category, "amount": float(row.total)}
        for row in income_result.all()
    ]

    # 支出分类
    expense_stmt = (
        select(Transaction.category, func.coalesce(func.sum(Transaction.amount), 0.0).label("total"))
        .where(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            extract("year", Transaction.transaction_date) == year,
            extract("month", Transaction.transaction_date) == month,
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    expense_result = await db.execute(expense_stmt)
    expense_by_category = [
        {"category": row.category, "amount": float(row.total)}
        for row in expense_result.all()
    ]

    # 月度汇总
    total_income = sum(item["amount"] for item in income_by_category)
    total_expense = sum(item["amount"] for item in expense_by_category)

    monthly_summary = {
        "year": year,
        "month": month,
        "total_income": float(total_income),
        "total_expense": float(total_expense),
        "balance": float(total_income - total_expense),
        "transaction_count": await _count_transactions(db, user_id, year, month),
    }

    return {
        "income_by_category": income_by_category,
        "expense_by_category": expense_by_category,
        "monthly_summary": monthly_summary,
    }


async def _count_transactions(
    db: AsyncSession, user_id: UUID, year: int, month: int
) -> int:
    stmt = select(func.count()).select_from(Transaction).where(
        Transaction.user_id == user_id,
        extract("year", Transaction.transaction_date) == year,
        extract("month", Transaction.transaction_date) == month,
    )
    return (await db.execute(stmt)).scalar() or 0
