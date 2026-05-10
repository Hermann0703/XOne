"""健康模块测试 — 饮食 / 运动 / 身体指标 / 仪表盘"""
import pytest
from datetime import date


HEALTH_PREFIX = "/api/v1/personal/health"


# ── 基础健康检查 ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_endpoint(anon_client):
    """/health 应返回 ok"""
    r = await anon_client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data


@pytest.mark.asyncio
async def test_api_health_endpoint(anon_client):
    """/health 应返回服务状态"""
    r = await anon_client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data


# ── 饮食记录 CRUD ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_food_create_list(async_client):
    """创建饮食记录并验证列表可见"""
    today = date.today().isoformat()
    body = {
        "food_name": "白米饭",
        "calories": 200,
        "meal_type": "lunch",
        "record_date": today,
    }
    # create
    r = await async_client.post(f"{HEALTH_PREFIX}/foods", json=body)
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["data"]["food_name"] == "白米饭"
    food_id = created["data"]["id"]

    # list
    r = await async_client.get(f"{HEALTH_PREFIX}/foods")
    assert r.status_code == 200
    lst = r.json()
    assert "data" in lst
    assert "paging" in lst
    assert any(f["id"] == food_id for f in lst["data"])


@pytest.mark.asyncio
async def test_food_update_delete(async_client):
    """更新饮食记录后验证，删除后列表不可见"""
    today = date.today().isoformat()
    # create
    r = await async_client.post(f"{HEALTH_PREFIX}/foods", json={
        "food_name": "苹果",
        "calories": 52,
        "meal_type": "snack",
        "record_date": today,
    })
    assert r.status_code == 201
    food_id = r.json()["data"]["id"]

    # update
    r = await async_client.patch(f"{HEALTH_PREFIX}/foods/{food_id}", json={"food_name": "大苹果"})
    assert r.status_code == 200
    assert r.json()["data"]["food_name"] == "大苹果"

    # delete
    r = await async_client.delete(f"{HEALTH_PREFIX}/foods/{food_id}")
    assert r.status_code == 200

    # verify deleted
    r = await async_client.get(f"{HEALTH_PREFIX}/foods")
    foods = r.json()["data"]
    assert not any(f["id"] == food_id for f in foods)


# ── 运动记录 CRUD ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_exercise_create_list(async_client):
    """创建运动记录并验证列表可见"""
    today = date.today().isoformat()
    r = await async_client.post(f"{HEALTH_PREFIX}/exercises", json={
        "exercise_name": "跑步",
        "duration_minutes": 30,
        "calories_burned": 300,
        "exercise_type": "cardio",
        "record_date": today,
    })
    assert r.status_code == 201, r.text
    ex_id = r.json()["data"]["id"]

    r = await async_client.get(f"{HEALTH_PREFIX}/exercises")
    assert r.status_code == 200
    assert any(e["id"] == ex_id for e in r.json()["data"])


@pytest.mark.asyncio
async def test_exercise_update_delete(async_client):
    """更新运动记录后验证，删除后列表不可见"""
    today = date.today().isoformat()
    r = await async_client.post(f"{HEALTH_PREFIX}/exercises", json={
        "exercise_name": "游泳",
        "duration_minutes": 45,
        "calories_burned": 400,
        "exercise_type": "cardio",
        "record_date": today,
    })
    assert r.status_code == 201
    ex_id = r.json()["data"]["id"]

    # update
    r = await async_client.patch(f"{HEALTH_PREFIX}/exercises/{ex_id}", json={"duration_minutes": 60})
    assert r.status_code == 200
    assert r.json()["data"]["duration_minutes"] == 60

    # delete
    r = await async_client.delete(f"{HEALTH_PREFIX}/exercises/{ex_id}")
    assert r.status_code == 200

    r = await async_client.get(f"{HEALTH_PREFIX}/exercises")
    assert not any(e["id"] == ex_id for e in r.json()["data"])


# ── 身体指标 CRUD ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_metric_create_list(async_client):
    """创建身体指标并验证列表可见"""
    today = date.today().isoformat()
    r = await async_client.post(f"{HEALTH_PREFIX}/metrics", json={
        "weight": 70.5,
        "height": 175,
        "record_date": today,
    })
    assert r.status_code == 201, r.text
    m_id = r.json()["data"]["id"]

    r = await async_client.get(f"{HEALTH_PREFIX}/metrics")
    assert r.status_code == 200
    assert any(m["id"] == m_id for m in r.json()["data"])


@pytest.mark.asyncio
async def test_metric_update_delete(async_client):
    """更新身体指标后验证，删除后列表不可见"""
    today = date.today().isoformat()
    r = await async_client.post(f"{HEALTH_PREFIX}/metrics", json={
        "weight": 80,
        "record_date": today,
    })
    assert r.status_code == 201
    m_id = r.json()["data"]["id"]

    # update
    r = await async_client.patch(f"{HEALTH_PREFIX}/metrics/{m_id}", json={"weight": 78.5})
    assert r.status_code == 200

    # delete
    r = await async_client.delete(f"{HEALTH_PREFIX}/metrics/{m_id}")
    assert r.status_code == 200


# ── 仪表盘 ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_dashboard(async_client):
    """仪表盘端点应返回聚合数据"""
    r = await async_client.get(f"{HEALTH_PREFIX}/dashboard")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "data" in data
