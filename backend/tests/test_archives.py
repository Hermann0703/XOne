"""档案管理模块测试 — 档案 CRUD"""

import pytest


class TestArchiveCRUD:
    """档案 CRUD 测试"""

    async def test_create_archive(self, async_client):
        """创建档案应返回档案数据"""
        r = await async_client.post(
            "/api/v1/work/archives?user_id=1",
            json={
                "archive_no": "ARC-2024-001",
                "title": "测试档案",
                "security_level": "内部",
                "status": 0,
                "description": "这是一个测试档案",
                "keywords": "测试,档案",
                "location": "A柜-3层",
            },
        )
        assert r.status_code == 201, f"创建档案失败: {r.text}"
        data = r.json()["data"]
        # archive_service returns ORM objects serialized to JSON by FastAPI
        assert data["archive_no"] == "ARC-2024-001"
        assert data["title"] == "测试档案"
        assert data["security_level"] == "内部"
        assert data["status"] == 0

    async def test_list_archives(self, async_client):
        """列表查询应返回档案列表"""
        # 创建两条档案
        await async_client.post(
            "/api/v1/work/archives?user_id=1",
            json={
                "archive_no": "ARC-LIST-001",
                "title": "档案A",
                "security_level": "公开",
                "status": 1,
            },
        )
        await async_client.post(
            "/api/v1/work/archives?user_id=1",
            json={
                "archive_no": "ARC-LIST-002",
                "title": "档案B",
                "security_level": "内部",
                "status": 1,
            },
        )

        r = await async_client.get(
            "/api/v1/work/archives?user_id=1&page=1&size=20"
        )
        assert r.status_code == 200
        body = r.json()
        assert body["message"] == "查询成功"
        # data 结构: {"items": [...], "total": int}
        assert body["data"]["total"] >= 2

    async def test_list_archives_with_search(self, async_client):
        """搜索档案应返回匹配结果"""
        await async_client.post(
            "/api/v1/work/archives?user_id=1",
            json={
                "archive_no": "ARC-SEARCH-1",
                "title": "年度财务报告",
                "security_level": "内部",
                "status": 1,
                "keywords": "财务,年度",
            },
        )
        await async_client.post(
            "/api/v1/work/archives?user_id=1",
            json={
                "archive_no": "ARC-SEARCH-2",
                "title": "人事档案",
                "security_level": "机密",
                "status": 1,
                "keywords": "人事,员工",
            },
        )

        r = await async_client.get(
            "/api/v1/work/archives?user_id=1&search=财务"
        )
        assert r.status_code == 200
        items = r.json()["data"]["items"]
        assert len(items) >= 1
        # 至少有一条匹配
        titles = [item["title"] for item in items]
        assert any("财务" in t for t in titles)

    async def test_list_archives_filter_by_status(self, async_client):
        """按状态筛选档案"""
        await async_client.post(
            "/api/v1/work/archives?user_id=1",
            json={
                "archive_no": "ARC-DRAFT-1",
                "title": "草稿档案",
                "security_level": "公开",
                "status": 0,
            },
        )
        await async_client.post(
            "/api/v1/work/archives?user_id=1",
            json={
                "archive_no": "ARC-DONE-1",
                "title": "已归档档案",
                "security_level": "公开",
                "status": 1,
            },
        )

        r = await async_client.get(
            "/api/v1/work/archives?user_id=1&status=1"
        )
        assert r.status_code == 200
        items = r.json()["data"]["items"]
        assert len(items) >= 1
        for item in items:
            assert item["status"] == 1

    async def test_list_archives_filter_by_security(self, async_client):
        """按密级筛选档案"""
        await async_client.post(
            "/api/v1/work/archives?user_id=1",
            json={
                "archive_no": "ARC-PUB-1",
                "title": "公开档案",
                "security_level": "公开",
                "status": 1,
            },
        )
        await async_client.post(
            "/api/v1/work/archives?user_id=1",
            json={
                "archive_no": "ARC-SEC-1",
                "title": "机密档案",
                "security_level": "机密",
                "status": 1,
            },
        )

        r = await async_client.get(
            "/api/v1/work/archives?user_id=1&security_level=机密"
        )
        assert r.status_code == 200
        items = r.json()["data"]["items"]
        assert len(items) >= 1
        for item in items:
            assert item["security_level"] == "机密"
