"""观影模块测试 — 影视 CRUD"""

import pytest

MEDIA_PREFIX = "/api/v1/personal/media"


# ── 影视 CRUD ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_get_list(async_client):
    """创建影视 -> 按ID获取 -> 列表验证"""
    r = await async_client.post(f"{MEDIA_PREFIX}/movies", json={
        "title": "肖申克的救赎",
        "title_en": "The Shawshank Redemption",
        "year": 1994,
        "director": "弗兰克·德拉邦特",
        "genre": "剧情/犯罪",
        "country": "美国",
        "status": "watched",
        "rating": 5,
        "duration_minutes": 142,
        "my_review": "经典之作，百看不厌",
        "tags": "经典,励志,越狱",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["message"] == "添加成功"
    movie = body["data"]
    movie_id = movie["id"]
    assert movie["title"] == "肖申克的救赎"
    assert movie["status"] == "watched"
    assert movie["rating"] == 5
    assert movie["created_at"] is not None
    assert movie["updated_at"] is not None

    # get by id
    r = await async_client.get(f"{MEDIA_PREFIX}/movies/{movie_id}")
    assert r.status_code == 200
    detail = r.json()["data"]
    assert detail["title"] == "肖申克的救赎"
    assert detail["title_en"] == "The Shawshank Redemption"
    assert detail["director"] == "弗兰克·德拉邦特"

    # list
    r = await async_client.get(f"{MEDIA_PREFIX}/movies")
    assert r.status_code == 200
    lst = r.json()["data"]
    assert "items" in lst
    assert "total" in lst
    assert lst["total"] >= 1
    assert any(m["id"] == movie_id for m in lst["items"])


@pytest.mark.asyncio
async def test_update_delete(async_client):
    """更新 -> 验证 -> 删除 -> 确认 404"""
    r = await async_client.post(f"{MEDIA_PREFIX}/movies", json={
        "title": "临时影片",
        "genre": "测试",
        "status": "want_to_watch",
    })
    assert r.status_code == 201
    movie_id = r.json()["data"]["id"]

    # update
    r = await async_client.patch(f"{MEDIA_PREFIX}/movies/{movie_id}", json={
        "title": "更新后的影片",
        "status": "watching",
        "rating": 4,
        "my_review": "还不错",
    })
    assert r.status_code == 200, r.text
    updated = r.json()["data"]
    assert updated["title"] == "更新后的影片"
    assert updated["status"] == "watching"
    assert updated["rating"] == 4
    assert updated["my_review"] == "还不错"

    # verify get reflects update
    r = await async_client.get(f"{MEDIA_PREFIX}/movies/{movie_id}")
    assert r.status_code == 200
    assert r.json()["data"]["title"] == "更新后的影片"

    # delete
    r = await async_client.delete(f"{MEDIA_PREFIX}/movies/{movie_id}")
    assert r.status_code == 200
    assert r.json()["message"] == "删除成功"

    # verify deleted -> 404
    r = await async_client.get(f"{MEDIA_PREFIX}/movies/{movie_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_not_found_404(async_client):
    """获取不存在的影视应返回 404"""
    r = await async_client.get(f"{MEDIA_PREFIX}/movies/99999")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_not_found_404(async_client):
    """更新不存在的影视应返回 404"""
    r = await async_client.patch(f"{MEDIA_PREFIX}/movies/99999", json={
        "title": "不会存在",
    })
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_not_found_404(async_client):
    """删除不存在的影视应返回 404"""
    r = await async_client.delete(f"{MEDIA_PREFIX}/movies/99999")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_pagination(async_client):
    """创建多条影视记录，测试分页"""
    # create 3 movies
    ids = []
    for i in range(3):
        r = await async_client.post(f"{MEDIA_PREFIX}/movies", json={
            "title": f"分页测试影片{i}",
            "status": "want_to_watch",
        })
        assert r.status_code == 201
        ids.append(r.json()["data"]["id"])

    # page 1, size 2
    r = await async_client.get(
        f"{MEDIA_PREFIX}/movies", params={"page": 1, "size": 2}
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert len(data["items"]) == 2
    assert data["total"] >= 3

    # page 2, size 2 — should have at least 1
    r = await async_client.get(
        f"{MEDIA_PREFIX}/movies", params={"page": 2, "size": 2}
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_filter_by_status(async_client):
    """按观影状态筛选影视列表"""
    r = await async_client.post(f"{MEDIA_PREFIX}/movies", json={
        "title": "想看的电影",
        "status": "want_to_watch",
    })
    assert r.status_code == 201

    r = await async_client.post(f"{MEDIA_PREFIX}/movies", json={
        "title": "已看过的电影",
        "status": "watched",
        "rating": 4,
    })
    assert r.status_code == 201

    # filter watched
    r = await async_client.get(
        f"{MEDIA_PREFIX}/movies", params={"status": "watched"}
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["total"] >= 1
    for item in data["items"]:
        assert item["status"] == "watched"

    # filter want_to_watch
    r = await async_client.get(
        f"{MEDIA_PREFIX}/movies", params={"status": "want_to_watch"}
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["total"] >= 1
    for item in data["items"]:
        assert item["status"] == "want_to_watch"


@pytest.mark.asyncio
async def test_search_by_title(async_client):
    """按片名搜索影视"""
    r = await async_client.post(f"{MEDIA_PREFIX}/movies", json={
        "title": "星际穿越",
        "title_en": "Interstellar",
        "director": "克里斯托弗·诺兰",
        "status": "watched",
        "rating": 5,
    })
    assert r.status_code == 201

    # search by Chinese title
    r = await async_client.get(
        f"{MEDIA_PREFIX}/movies", params={"search": "星际"}
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["total"] >= 1
    titles = [m["title"] for m in data["items"]]
    assert any("星际" in t for t in titles)

    # search by English title
    r = await async_client.get(
        f"{MEDIA_PREFIX}/movies", params={"search": "Interstellar"}
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["total"] >= 1

    # search by director
    r = await async_client.get(
        f"{MEDIA_PREFIX}/movies", params={"search": "诺兰"}
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_create_all_string_fields(async_client):
    """创建包含全部文本字段的影视记录（不含日期类型字段）"""
    r = await async_client.post(f"{MEDIA_PREFIX}/movies", json={
        "title": "千与千寻",
        "title_en": "Spirited Away",
        "year": 2001,
        "director": "宫崎骏",
        "genre": "动画/奇幻/冒险",
        "country": "日本",
        "poster_url": "https://example.com/poster.jpg",
        "tmdb_url": "https://www.themoviedb.org/movie/129",
        "douban_url": "https://movie.douban.com/subject/1291561/",
        "status": "watched",
        "rating": 5,
        "duration_minutes": 125,
        "my_review": "宫崎骏的巅峰之作，画面与音乐完美融合",
        "tags": "动画,奇幻,经典,吉卜力",
    })
    assert r.status_code == 201, r.text
    movie = r.json()["data"]
    assert movie["title"] == "千与千寻"
    assert movie["year"] == 2001
    assert movie["country"] == "日本"
    assert movie["rating"] == 5
    assert movie["poster_url"] == "https://example.com/poster.jpg"
    assert movie["tmdb_url"] == "https://www.themoviedb.org/movie/129"
    assert movie["tags"] == "动画,奇幻,经典,吉卜力"
