"""阅读模块测试 — 书籍 CRUD / 分页 / 筛选 / 搜索"""
import pytest


READING_PREFIX = "/api/v1/personal/reading"


# ── 基础 CRUD ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_book_create_and_get_detail(async_client):
    """创建书籍 → 按ID获取详情 → 验证字段正确"""
    r = await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "三体",
        "author": "刘慈欣",
        "isbn": "9787536692930",
        "status": "reading",
        "rating": 5,
        "total_pages": 500,
        "current_page": 120,
        "publisher": "重庆出版社",
        "publish_year": 2008,
        "notes": "非常震撼的科幻小说",
        "tags": "科幻,中国,经典",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["message"] == "添加成功"
    data = body["data"]
    book_id = data["id"]
    assert data["title"] == "三体"
    assert data["author"] == "刘慈欣"
    assert data["status"] == "reading"
    assert data["rating"] == 5
    assert data["total_pages"] == 500
    assert data["current_page"] == 120
    assert data["created_at"] is not None
    assert data["updated_at"] is not None

    # GET by id
    r = await async_client.get(f"{READING_PREFIX}/books/{book_id}")
    assert r.status_code == 200, r.text
    detail = r.json()
    assert detail["message"] == "查询成功"
    assert detail["data"]["title"] == "三体"
    assert detail["data"]["id"] == book_id
    assert detail["data"]["isbn"] == "9787536692930"
    assert detail["data"]["notes"] == "非常震撼的科幻小说"


@pytest.mark.asyncio
async def test_book_list_pagination(async_client):
    """列表接口应返回正确的分页结构"""
    # 创建多本书以确保分页数据充足
    titles = ["红楼梦", "西游记", "水浒传", "三国演义"]
    for i, t in enumerate(titles):
        r = await async_client.post(f"{READING_PREFIX}/books", json={
            "title": t,
            "author": f"作者{i}",
            "status": "want_to_read",
        })
        assert r.status_code == 201, f"创建 {t} 失败: {r.text}"

    # 默认分页
    r = await async_client.get(f"{READING_PREFIX}/books")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["message"] == "查询成功"
    assert "data" in body
    assert "items" in body["data"]
    assert "total" in body["data"]
    assert body["data"]["total"] >= 4

    # 第一页
    r = await async_client.get(f"{READING_PREFIX}/books?page=1&size=2")
    assert r.status_code == 200
    page1 = r.json()
    assert len(page1["data"]["items"]) == 2
    assert page1["data"]["total"] >= 4

    # 第二页
    r = await async_client.get(f"{READING_PREFIX}/books?page=2&size=2")
    assert r.status_code == 200
    page2 = r.json()
    assert len(page2["data"]["items"]) >= 2
    # 确保两页不重复
    page1_ids = {b["id"] for b in page1["data"]["items"]}
    page2_ids = {b["id"] for b in page2["data"]["items"]}
    assert page1_ids.isdisjoint(page2_ids)

    # page_size 边界测试
    r = await async_client.get(f"{READING_PREFIX}/books?size=1")
    assert r.status_code == 200
    assert len(r.json()["data"]["items"]) == 1


@pytest.mark.asyncio
async def test_book_update_and_verify(async_client):
    """更新书籍各字段 → 验证更新生效 → 验证未修改字段不变"""
    # 创建
    r = await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "原书名",
        "author": "原作者",
        "status": "want_to_read",
        "publisher": "原出版社",
        "rating": 3,
    })
    assert r.status_code == 201, r.text
    book_id = r.json()["data"]["id"]

    # 更新多个字段
    r = await async_client.patch(f"{READING_PREFIX}/books/{book_id}", json={
        "title": "新书名",
        "status": "reading",
        "rating": 4,
        "current_page": 50,
        "notes": "开始阅读了",
    })
    assert r.status_code == 200, r.text
    updated = r.json()
    assert updated["message"] == "更新成功"
    assert updated["data"]["title"] == "新书名"
    assert updated["data"]["status"] == "reading"
    assert updated["data"]["rating"] == 4
    assert updated["data"]["current_page"] == 50
    assert updated["data"]["notes"] == "开始阅读了"
    # 未修改的字段应保持原值
    assert updated["data"]["author"] == "原作者"
    assert updated["data"]["publisher"] == "原出版社"

    # 再次 GET 确认持久化
    r = await async_client.get(f"{READING_PREFIX}/books/{book_id}")
    assert r.status_code == 200
    assert r.json()["data"]["title"] == "新书名"


@pytest.mark.asyncio
async def test_book_delete_and_verify(async_client):
    """删除书籍 → 确认删除后 GET 返回 404 → DELETE 已删除的返回 404"""
    # 创建
    r = await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "待删除的书",
        "status": "dropped",
    })
    assert r.status_code == 201, r.text
    book_id = r.json()["data"]["id"]

    # 删除
    r = await async_client.delete(f"{READING_PREFIX}/books/{book_id}")
    assert r.status_code == 200, r.text
    assert r.json()["message"] == "删除成功"

    # GET 应 404
    r = await async_client.get(f"{READING_PREFIX}/books/{book_id}")
    assert r.status_code == 404, r.text

    # DELETE 已删除的也应 404
    r = await async_client.delete(f"{READING_PREFIX}/books/{book_id}")
    assert r.status_code == 404, r.text


@pytest.mark.asyncio
async def test_book_404_nonexistent(async_client):
    """访问不存在的书籍应返回 404"""
    r = await async_client.get(f"{READING_PREFIX}/books/99999")
    assert r.status_code == 404

    r = await async_client.patch(f"{READING_PREFIX}/books/99999", json={"title": "x"})
    assert r.status_code == 404

    r = await async_client.delete(f"{READING_PREFIX}/books/99999")
    assert r.status_code == 404


# ── 筛选与搜索 ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_book_filter_by_status(async_client):
    """按阅读状态筛选书籍"""
    # 创建不同状态的书籍
    r1 = await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "在读的书", "status": "reading",
    })
    assert r1.status_code == 201
    r2 = await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "已读的书", "status": "done",
    })
    assert r2.status_code == 201
    r3 = await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "想读的书", "status": "want_to_read",
    })
    assert r3.status_code == 201

    # 筛选 reading
    r = await async_client.get(f"{READING_PREFIX}/books?status=reading")
    assert r.status_code == 200, r.text
    items = r.json()["data"]["items"]
    assert all(b["status"] == "reading" for b in items)
    assert any(b["title"] == "在读的书" for b in items)
    assert not any(b["title"] == "已读的书" for b in items)

    # 筛选 done
    r = await async_client.get(f"{READING_PREFIX}/books?status=done")
    assert r.status_code == 200
    items = r.json()["data"]["items"]
    assert all(b["status"] == "done" for b in items)
    assert any(b["title"] == "已读的书" for b in items)


@pytest.mark.asyncio
async def test_book_filter_by_tag(async_client):
    """按标签筛选书籍"""
    # 创建带标签的书籍
    await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "科幻巨著", "tags": "科幻,史诗",
    })
    await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "推理小说", "tags": "推理,悬疑",
    })

    r = await async_client.get(f"{READING_PREFIX}/books?tag=科幻")
    assert r.status_code == 200, r.text
    items = r.json()["data"]["items"]
    assert all("科幻" in (b.get("tags") or "") for b in items)
    assert any(b["title"] == "科幻巨著" for b in items)
    assert not any(b["title"] == "推理小说" for b in items)


@pytest.mark.asyncio
async def test_book_search(async_client):
    """按书名/作者搜索书籍"""
    # 创建测试数据
    await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "深入理解计算机系统", "author": "Randal E. Bryant",
    })
    await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "算法导论", "author": "Thomas H. Cormen",
    })
    await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "数据库系统概念", "author": "Abraham Silberschatz",
    })

    # 按书名搜索
    r = await async_client.get(f"{READING_PREFIX}/books?search=算法")
    assert r.status_code == 200, r.text
    items = r.json()["data"]["items"]
    assert len(items) >= 1
    assert any("算法" in b["title"] for b in items)

    # 按作者搜索
    r = await async_client.get(f"{READING_PREFIX}/books?search=Silberschatz")
    assert r.status_code == 200, r.text
    items = r.json()["data"]["items"]
    assert len(items) >= 1
    assert any("数据库" in b["title"] for b in items)

    # 无匹配
    r = await async_client.get(f"{READING_PREFIX}/books?search=不存在zzz")
    assert r.status_code == 200
    assert len(r.json()["data"]["items"]) == 0


# ── 边界与校验 ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_book_create_minimal(async_client):
    """仅提供必填字段（title）应创建成功"""
    r = await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "最小化测试",
    })
    assert r.status_code == 201, r.text
    data = r.json()["data"]
    assert data["title"] == "最小化测试"
    # 默认值
    assert data["status"] == "want_to_read"
    assert data["author"] is None
    assert data["rating"] is None


@pytest.mark.asyncio
async def test_book_create_with_dates(async_client):
    """创建带开始/完成日期的书籍"""
    r = await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "日期测试",
        "status": "done",
        "start_date": "2025-01-15",
        "finish_date": "2025-03-20",
    })
    assert r.status_code == 201, r.text
    data = r.json()["data"]
    assert data["start_date"] == "2025-01-15"
    assert data["finish_date"] == "2025-03-20"


@pytest.mark.asyncio
async def test_book_update_only_status(async_client):
    """只更新状态字段（常用操作：切换阅读进度）"""
    r = await async_client.post(f"{READING_PREFIX}/books", json={
        "title": "状态切换测试",
        "status": "want_to_read",
    })
    assert r.status_code == 201
    book_id = r.json()["data"]["id"]

    # 切换为 reading
    r = await async_client.patch(f"{READING_PREFIX}/books/{book_id}", json={
        "status": "reading",
        "current_page": 1,
    })
    assert r.status_code == 200, r.text
    assert r.json()["data"]["status"] == "reading"
    assert r.json()["data"]["current_page"] == 1

    # 切换为 done
    r = await async_client.patch(f"{READING_PREFIX}/books/{book_id}", json={
        "status": "done",
        "rating": 5,
        "finish_date": "2025-12-31",
    })
    assert r.status_code == 200, r.text
    assert r.json()["data"]["status"] == "done"
    assert r.json()["data"]["rating"] == 5
    assert r.json()["data"]["finish_date"] == "2025-12-31"
