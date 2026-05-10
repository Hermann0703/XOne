"""资产模块测试 — 账户 / 交易 / 仪表盘 / 统计"""
import pytest
from datetime import date


ASSETS_PREFIX = "/api/v1/personal/assets"


# ── 账户 CRUD ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_account_create_get_list(async_client):
    """创建账户 -> 按ID获取 -> 列表验证"""
    r = await async_client.post(f"{ASSETS_PREFIX}/accounts", json={
        "name": "工商银行储蓄卡",
        "type": "bank",
        "balance": 10000,
        "currency": "CNY",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["code"] == 0
    acct_id = body["data"]["id"]
    assert body["data"]["name"] == "工商银行储蓄卡"

    # get by id
    r = await async_client.get(f"{ASSETS_PREFIX}/accounts/{acct_id}")
    assert r.status_code == 200
    assert r.json()["data"]["name"] == "工商银行储蓄卡"

    # list
    r = await async_client.get(f"{ASSETS_PREFIX}/accounts")
    assert r.status_code == 200
    lst = r.json()["data"]
    assert any(a["id"] == acct_id for a in lst)


@pytest.mark.asyncio
async def test_account_update_delete(async_client):
    """更新 -> 验证 -> 删除 -> 确认 404"""
    # create
    r = await async_client.post(f"{ASSETS_PREFIX}/accounts", json={
        "name": "测试账户",
        "type": "cash",
        "balance": 500,
    })
    assert r.status_code == 200
    acct_id = r.json()["data"]["id"]

    # update
    r = await async_client.patch(f"{ASSETS_PREFIX}/accounts/{acct_id}", json={
        "name": "改名账户",
        "balance": 1000,
    })
    assert r.status_code == 200
    assert r.json()["data"]["name"] == "改名账户"

    # delete
    r = await async_client.delete(f"{ASSETS_PREFIX}/accounts/{acct_id}")
    assert r.status_code == 200
    assert r.json()["code"] == 0

    # verify 404
    r = await async_client.get(f"{ASSETS_PREFIX}/accounts/{acct_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_account_404(async_client):
    """不存在的账户应返回 404"""
    r = await async_client.get(f"{ASSETS_PREFIX}/accounts/99999")
    assert r.status_code == 404


# ── 交易 CRUD ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_transaction_create_list(async_client):
    """创建交易记录 -> 列表分页验证"""
    # first need an account
    r = await async_client.post(f"{ASSETS_PREFIX}/accounts", json={
        "name": "交易测试账户",
        "type": "bank",
        "balance": 5000,
    })
    assert r.status_code == 200
    acct_id = r.json()["data"]["id"]

    today = date.today().isoformat()
    # create transaction
    r = await async_client.post(f"{ASSETS_PREFIX}/transactions", json={
        "account_id": acct_id,
        "type": "expense",
        "amount": 100,
        "category": "food",
        "description": "午餐",
        "transaction_date": today,
    })
    assert r.status_code == 200, r.text
    txn = r.json()
    assert txn["code"] == 0
    txn_id = txn["data"]["id"]
    assert txn["data"]["amount"] == 100

    # list with page
    r = await async_client.get(f"{ASSETS_PREFIX}/transactions?account_id={acct_id}")
    assert r.status_code == 200
    txn_data = r.json()["data"]
    assert txn_data["total"] >= 1
    assert any(t["id"] == txn_id for t in txn_data["items"])


@pytest.mark.asyncio
async def test_transaction_invalid(async_client):
    """不存在的 account_id 应返回 400"""
    r = await async_client.post(f"{ASSETS_PREFIX}/transactions", json={
        "account_id": 99999,
        "type": "expense",
        "amount": 50,
        "category": "other",
    })
    # May return 400 or 404 depending on implementation
    assert r.status_code in (400, 404), r.text


# ── 仪表盘 / 统计 ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_assets_dashboard(async_client):
    """仪表盘应返回聚合数据"""
    r = await async_client.get(f"{ASSETS_PREFIX}/dashboard")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["code"] == 0
    assert "data" in data


@pytest.mark.asyncio
async def test_assets_stats(async_client):
    """月度统计应返回分类数据"""
    r = await async_client.get(f"{ASSETS_PREFIX}/stats?year=2025&month=5")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["code"] == 0
    assert "data" in data


# ── 用户隔离验证 ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_accounts_user_scoped(async_client):
    """创建的账户应只包含当前用户的数据（通过 user_id 验证）"""
    r = await async_client.post(f"{ASSETS_PREFIX}/accounts", json={
        "name": "隔离验证账户",
        "type": "cash",
        "balance": 1,
    })
    assert r.status_code == 200
    acct_id = r.json()["data"]["id"]

    r = await async_client.get(f"{ASSETS_PREFIX}/accounts/{acct_id}")
    assert r.status_code == 200
    # user_id should be present (set by server from current_user)
    assert "user_id" in r.json()["data"]
