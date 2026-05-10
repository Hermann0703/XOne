"""购物模块测试 — 预算 / 购物项 / 仪表盘"""
import pytest
from datetime import date, timedelta


SHOP_PREFIX = "/api/v1/personal/shopping"


# ── 预算 CRUD ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_budget_create_get_list(async_client):
    """创建预算 -> 按ID获取 -> 列表验证"""
    today = date.today()
    r = await async_client.post(f"{SHOP_PREFIX}/budgets", json={
        "name": "五月日用预算",
        "amount": 3000,
        "category": "日用品",
        "start_date": today.isoformat(),
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["code"] == 0
    budget_id = body["data"]["id"]
    assert body["data"]["name"] == "五月日用预算"

    # get by id
    r = await async_client.get(f"{SHOP_PREFIX}/budgets/{budget_id}")
    assert r.status_code == 200
    assert r.json()["data"]["name"] == "五月日用预算"

    # list
    r = await async_client.get(f"{SHOP_PREFIX}/budgets")
    assert r.status_code == 200
    lst = r.json()["data"]
    assert any(b["id"] == budget_id for b in lst)


@pytest.mark.asyncio
async def test_budget_update_delete(async_client):
    """更新 -> 验证 -> 删除 -> 确认 404"""
    today = date.today()
    r = await async_client.post(f"{SHOP_PREFIX}/budgets", json={
        "name": "临时预算",
        "amount": 500,
        "category": "零食",
        "start_date": today.isoformat(),
    })
    assert r.status_code == 200
    bid = r.json()["data"]["id"]

    # update
    r = await async_client.patch(f"{SHOP_PREFIX}/budgets/{bid}", json={
        "name": "更新预算",
        "amount": 800,
    })
    assert r.status_code == 200
    assert r.json()["data"]["name"] == "更新预算"

    # delete
    r = await async_client.delete(f"{SHOP_PREFIX}/budgets/{bid}")
    assert r.status_code == 200
    assert r.json()["code"] == 0

    # verify 404
    r = await async_client.get(f"{SHOP_PREFIX}/budgets/{bid}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_budget_404(async_client):
    """不存在的预算应返回 404"""
    r = await async_client.get(f"{SHOP_PREFIX}/budgets/99999")
    assert r.status_code == 404


# ── 购物项 CRUD ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_item_create_get_list(async_client):
    """创建购物项 -> 按ID获取 -> 列表验证"""
    r = await async_client.post(f"{SHOP_PREFIX}/items", json={
        "name": "无印良品笔记本",
        "category": "文具",
        "price": 25,
        "quantity": 3,
        "priority": "medium",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["code"] == 0
    item_id = body["data"]["id"]
    assert body["data"]["name"] == "无印良品笔记本"
    assert body["data"]["status"] == "pending"

    # get by id
    r = await async_client.get(f"{SHOP_PREFIX}/items/{item_id}")
    assert r.status_code == 200
    assert r.json()["data"]["quantity"] == 3

    # list
    r = await async_client.get(f"{SHOP_PREFIX}/items")
    assert r.status_code == 200
    lst = r.json()["data"]
    assert any(i["id"] == item_id for i in lst)


@pytest.mark.asyncio
async def test_item_update_delete(async_client):
    """更新 -> 验证 -> 删除 -> 确认 404"""
    r = await async_client.post(f"{SHOP_PREFIX}/items", json={
        "name": "临时商品",
        "category": "测试",
        "price": 10,
    })
    assert r.status_code == 200
    item_id = r.json()["data"]["id"]

    # update status
    r = await async_client.patch(f"{SHOP_PREFIX}/items/{item_id}", json={
        "status": "purchased",
        "purchased_date": date.today().isoformat(),
    })
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "purchased"

    # delete
    r = await async_client.delete(f"{SHOP_PREFIX}/items/{item_id}")
    assert r.status_code == 200

    r = await async_client.get(f"{SHOP_PREFIX}/items/{item_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_item_with_budget(async_client):
    """创建带预算关联的购物项"""
    today = date.today()
    # create budget
    r = await async_client.post(f"{SHOP_PREFIX}/budgets", json={
        "name": "电子预算",
        "amount": 5000,
        "category": "电子产品",
        "start_date": today.isoformat(),
    })
    assert r.status_code == 200
    budget_id = r.json()["data"]["id"]

    # create item with budget
    r = await async_client.post(f"{SHOP_PREFIX}/items", json={
        "name": "机械键盘",
        "category": "电子产品",
        "price": 499,
        "budget_id": budget_id,
    })
    assert r.status_code == 200, r.text
    item = r.json()["data"]
    assert item["budget_id"] == budget_id
    # budget relation should be populated
    assert item.get("budget") is not None
    assert item["budget"]["name"] == "电子预算"


@pytest.mark.asyncio
async def test_item_404(async_client):
    """不存在的购物项应返回 404"""
    r = await async_client.get(f"{SHOP_PREFIX}/items/99999")
    assert r.status_code == 404


# ── 仪表盘 ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_shopping_dashboard(async_client):
    """仪表盘应返回聚合数据"""
    r = await async_client.get(f"{SHOP_PREFIX}/dashboard")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["code"] == 0
    assert "data" in data
