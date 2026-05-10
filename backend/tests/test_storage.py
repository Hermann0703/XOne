"""存储模块测试 — 档案柜 / 档案盒 CRUD"""
import pytest

STORAGE_PREFIX = "/api/v1/work/storage"


# ── 档案柜 CRUD ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cabinet_create_and_get(async_client):
    """创建档案柜 → 按ID获取详情 → 验证字段"""
    r = await async_client.post(f"{STORAGE_PREFIX}/cabinets", json={
        "name": "A区档案柜",
        "code": "CAB-A-001",
        "location": "一楼档案室",
        "floor": 1,
        "room": "101",
        "description": "存放财务档案",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["message"] == "创建成功"
    data = body["data"]
    cabinet_id = data["id"]
    assert data["name"] == "A区档案柜"
    assert data["code"] == "CAB-A-001"
    assert data["location"] == "一楼档案室"
    assert data["floor"] == 1
    assert data["room"] == "101"
    assert data["description"] == "存放财务档案"
    assert data["created_at"] is not None
    assert data["updated_at"] is not None

    # GET by id
    r = await async_client.get(f"{STORAGE_PREFIX}/cabinets/{cabinet_id}")
    assert r.status_code == 200, r.text
    detail = r.json()
    assert detail["message"] == "查询成功"
    assert detail["data"]["id"] == cabinet_id
    assert detail["data"]["name"] == "A区档案柜"


@pytest.mark.asyncio
async def test_cabinet_list(async_client):
    """列表接口应返回正确的分页结构"""
    for i in range(3):
        r = await async_client.post(f"{STORAGE_PREFIX}/cabinets", json={
            "name": f"列表测试柜{i}",
            "code": f"CAB-LIST-{i}",
            "location": f"位置{i}",
        })
        assert r.status_code == 201, f"创建柜{i}失败: {r.text}"

    r = await async_client.get(f"{STORAGE_PREFIX}/cabinets")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["message"] == "查询成功"
    assert "items" in body["data"]
    assert "total" in body["data"]
    assert body["data"]["total"] >= 3

    # 分页
    r = await async_client.get(f"{STORAGE_PREFIX}/cabinets?page=1&size=2")
    assert r.status_code == 200
    page1 = r.json()
    assert len(page1["data"]["items"]) == 2


@pytest.mark.asyncio
async def test_cabinet_update(async_client):
    """更新档案柜 → 验证更新生效 → 未修改字段不变"""
    r = await async_client.post(f"{STORAGE_PREFIX}/cabinets", json={
        "name": "原档案柜",
        "code": "CAB-UPDATE-001",
        "location": "原位置",
        "floor": 2,
        "description": "原描述",
    })
    assert r.status_code == 201, r.text
    cabinet_id = r.json()["data"]["id"]

    # 更新部分字段
    r = await async_client.patch(f"{STORAGE_PREFIX}/cabinets/{cabinet_id}", json={
        "name": "新档案柜",
        "location": "新位置",
        "description": "新描述",
    })
    assert r.status_code == 200, r.text
    updated = r.json()
    assert updated["message"] == "更新成功"
    assert updated["data"]["name"] == "新档案柜"
    assert updated["data"]["location"] == "新位置"
    assert updated["data"]["description"] == "新描述"
    assert updated["data"]["code"] == "CAB-UPDATE-001"
    assert updated["data"]["floor"] == 2

    # GET 确认持久化
    r = await async_client.get(f"{STORAGE_PREFIX}/cabinets/{cabinet_id}")
    assert r.status_code == 200
    assert r.json()["data"]["name"] == "新档案柜"


@pytest.mark.asyncio
async def test_cabinet_delete(async_client):
    """删除档案柜 → 确认删除后 404"""
    r = await async_client.post(f"{STORAGE_PREFIX}/cabinets", json={
        "name": "待删除柜",
        "code": "CAB-DEL-001",
        "location": "某处",
    })
    assert r.status_code == 201, r.text
    cabinet_id = r.json()["data"]["id"]

    # 删除
    r = await async_client.delete(f"{STORAGE_PREFIX}/cabinets/{cabinet_id}")
    assert r.status_code == 200, r.text
    assert r.json()["message"] == "删除成功"

    # GET 应 404
    r = await async_client.get(f"{STORAGE_PREFIX}/cabinets/{cabinet_id}")
    assert r.status_code == 404, r.text

    # DELETE 已删除的也应 404
    r = await async_client.delete(f"{STORAGE_PREFIX}/cabinets/{cabinet_id}")
    assert r.status_code == 404, r.text


@pytest.mark.asyncio
async def test_cabinet_404(async_client):
    """不存在的档案柜应返回 404"""
    r = await async_client.get(f"{STORAGE_PREFIX}/cabinets/99999")
    assert r.status_code == 404

    r = await async_client.patch(f"{STORAGE_PREFIX}/cabinets/99999", json={"name": "x"})
    assert r.status_code == 404

    r = await async_client.delete(f"{STORAGE_PREFIX}/cabinets/99999")
    assert r.status_code == 404


# ── 档案盒 CRUD ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_box_create_and_get(async_client):
    """创建档案盒 → 按ID获取 → 验证字段"""
    # 先创建档案柜
    r = await async_client.post(f"{STORAGE_PREFIX}/cabinets", json={
        "name": "盒测试柜",
        "code": "CAB-BOX-001",
        "location": "测试区",
    })
    assert r.status_code == 201, r.text
    cabinet_id = r.json()["data"]["id"]

    # 创建档案盒
    r = await async_client.post(f"{STORAGE_PREFIX}/boxes", json={
        "cabinet_id": cabinet_id,
        "box_no": "BOX-001",
        "row": 1,
        "col": 2,
        "layer": 3,
        "barcode": "BC-001",
        "status": "empty",
        "description": "测试盒",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["message"] == "创建成功"
    data = body["data"]
    box_id = data["id"]
    assert data["cabinet_id"] == cabinet_id
    assert data["box_no"] == "BOX-001"
    assert data["row"] == 1
    assert data["col"] == 2
    assert data["layer"] == 3
    assert data["barcode"] == "BC-001"
    assert data["status"] == "empty"
    assert data["description"] == "测试盒"
    assert data["created_at"] is not None

    # GET by id
    r = await async_client.get(f"{STORAGE_PREFIX}/boxes/{box_id}")
    assert r.status_code == 200, r.text
    detail = r.json()
    assert detail["message"] == "查询成功"
    assert detail["data"]["id"] == box_id
    assert detail["data"]["box_no"] == "BOX-001"


@pytest.mark.asyncio
async def test_box_create_nonexistent_cabinet(async_client):
    """创建档案盒时指定不存在的档案柜应返回 404"""
    r = await async_client.post(f"{STORAGE_PREFIX}/boxes", json={
        "cabinet_id": 99999,
        "box_no": "BOX-NO-CAB",
        "status": "empty",
    })
    assert r.status_code == 404, r.text


@pytest.mark.asyncio
async def test_box_list(async_client):
    """档案盒列表应支持分页、按档案柜筛选、按状态筛选"""
    # 创建档案柜
    r = await async_client.post(f"{STORAGE_PREFIX}/cabinets", json={
        "name": "列表盒柜",
        "code": "CAB-BOXLIST-001",
        "location": "某处",
    })
    assert r.status_code == 201, r.text
    cabinet_id = r.json()["data"]["id"]

    # 创建多个档案盒
    for i in range(5):
        r = await async_client.post(f"{STORAGE_PREFIX}/boxes", json={
            "cabinet_id": cabinet_id,
            "box_no": f"BOX-LIST-{i}",
            "status": "empty",
        })
        assert r.status_code == 201, f"创建盒{i}失败: {r.text}"

    # 全部列表
    r = await async_client.get(f"{STORAGE_PREFIX}/boxes")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["message"] == "查询成功"
    assert body["data"]["total"] >= 5

    # 按档案柜筛选
    r = await async_client.get(f"{STORAGE_PREFIX}/boxes?cabinet_id={cabinet_id}")
    assert r.status_code == 200
    items = r.json()["data"]["items"]
    assert all(b["cabinet_id"] == cabinet_id for b in items)

    # 按状态筛选
    r = await async_client.get(f"{STORAGE_PREFIX}/boxes?status=empty")
    assert r.status_code == 200
    items = r.json()["data"]["items"]
    assert all(b["status"] == "empty" for b in items)

    # 分页
    r = await async_client.get(f"{STORAGE_PREFIX}/boxes?page=1&size=2")
    assert r.status_code == 200
    assert len(r.json()["data"]["items"]) == 2


@pytest.mark.asyncio
async def test_box_update(async_client):
    """更新档案盒 → 验证更新生效"""
    r = await async_client.post(f"{STORAGE_PREFIX}/cabinets", json={
        "name": "更新盒柜",
        "code": "CAB-BOXUPD-001",
        "location": "某处",
    })
    assert r.status_code == 201
    cabinet_id = r.json()["data"]["id"]

    r = await async_client.post(f"{STORAGE_PREFIX}/boxes", json={
        "cabinet_id": cabinet_id,
        "box_no": "BOX-UPD-001",
        "status": "empty",
        "row": 1,
    })
    assert r.status_code == 201, r.text
    box_id = r.json()["data"]["id"]

    # 更新
    r = await async_client.patch(f"{STORAGE_PREFIX}/boxes/{box_id}", json={
        "status": "full",
        "row": 5,
        "description": "已满",
    })
    assert r.status_code == 200, r.text
    updated = r.json()
    assert updated["message"] == "更新成功"
    assert updated["data"]["status"] == "full"
    assert updated["data"]["row"] == 5
    assert updated["data"]["description"] == "已满"
    assert updated["data"]["box_no"] == "BOX-UPD-001"

    # GET 确认
    r = await async_client.get(f"{STORAGE_PREFIX}/boxes/{box_id}")
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "full"


@pytest.mark.asyncio
async def test_box_delete(async_client):
    """删除档案盒 → 确认 404"""
    r = await async_client.post(f"{STORAGE_PREFIX}/cabinets", json={
        "name": "删盒柜",
        "code": "CAB-BOXDEL-001",
        "location": "某处",
    })
    assert r.status_code == 201
    cabinet_id = r.json()["data"]["id"]

    r = await async_client.post(f"{STORAGE_PREFIX}/boxes", json={
        "cabinet_id": cabinet_id,
        "box_no": "BOX-DEL-001",
        "status": "empty",
    })
    assert r.status_code == 201, r.text
    box_id = r.json()["data"]["id"]

    # 删除
    r = await async_client.delete(f"{STORAGE_PREFIX}/boxes/{box_id}")
    assert r.status_code == 200, r.text
    assert r.json()["message"] == "删除成功"

    # GET 应 404
    r = await async_client.get(f"{STORAGE_PREFIX}/boxes/{box_id}")
    assert r.status_code == 404

    # DELETE 已删除的也应 404
    r = await async_client.delete(f"{STORAGE_PREFIX}/boxes/{box_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_box_404(async_client):
    """不存在的档案盒应返回 404"""
    r = await async_client.get(f"{STORAGE_PREFIX}/boxes/99999")
    assert r.status_code == 404

    r = await async_client.patch(f"{STORAGE_PREFIX}/boxes/99999", json={"status": "full"})
    assert r.status_code == 404

    r = await async_client.delete(f"{STORAGE_PREFIX}/boxes/99999")
    assert r.status_code == 404


# ── 关联查询 ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cabinet_boxes(async_client):
    """获取档案柜内的所有档案盒"""
    r = await async_client.post(f"{STORAGE_PREFIX}/cabinets", json={
        "name": "关联测试柜",
        "code": "CAB-LINK-001",
        "location": "某处",
    })
    assert r.status_code == 201
    cabinet_id = r.json()["data"]["id"]

    # 创建几个盒
    for i in range(3):
        r = await async_client.post(f"{STORAGE_PREFIX}/boxes", json={
            "cabinet_id": cabinet_id,
            "box_no": f"BOX-LINK-{i}",
            "status": "empty",
        })
        assert r.status_code == 201

    # 获取档案柜内所有盒
    r = await async_client.get(f"{STORAGE_PREFIX}/cabinets/{cabinet_id}/boxes")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["message"] == "查询成功"
    assert body["data"]["total"] == 3
    assert len(body["data"]["items"]) == 3
    assert all(b["cabinet_id"] == cabinet_id for b in body["data"]["items"])

    # 不存在的档案柜
    r = await async_client.get(f"{STORAGE_PREFIX}/cabinets/99999/boxes")
    assert r.status_code == 404
