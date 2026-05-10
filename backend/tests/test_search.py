"""全局搜索模块测试 — 匹配当前 POST API

POST /api/v1/work/search/global   — 全局搜索
POST /api/v1/work/search/reindex  — 管理员重建索引

使用 Mock 替代真实 Meilisearch 服务。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_search_client():
    """创建 mock MeilisearchClient 并注入 get_search_client。"""
    mock_client = MagicMock()
    mock_client.search_global = MagicMock()
    # 其他方法也用 MagicMock 防止意外调用报错
    mock_client.delete_all_documents = MagicMock()
    mock_client.index_document = MagicMock()

    with patch("app.api.work.search.get_search_client", return_value=mock_client):
        yield mock_client


class TestGlobalSearch:
    """全局搜索 POST /api/v1/work/search/global"""

    async def test_global_search(self, async_client, mock_search_client):
        """全局搜索应返回聚合结果"""
        mock_search_client.search_global.return_value = {
            "results": [
                {"id": "contract_1", "title": "测试合同", "type": "contract"},
                {"id": "archive_1", "title": "测试档案", "type": "archive"},
            ],
            "total": 2,
        }

        r = await async_client.post(
            "/api/v1/work/search/global",
            json={"query": "测试", "limit": 20},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["code"] == 0
        assert body["data"]["total"] == 2
        assert len(body["data"]["results"]) == 2

    async def test_global_search_no_results(self, async_client, mock_search_client):
        """无结果搜索应返回空列表"""
        mock_search_client.search_global.return_value = {
            "results": [],
            "total": 0,
        }

        r = await async_client.post(
            "/api/v1/work/search/global",
            json={"query": "不存在的内容", "limit": 20},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["data"]["total"] == 0
        assert body["data"]["results"] == []

    async def test_global_search_empty_query(self, async_client):
        """空查询应返回 422（Pydantic 校验 min_length=1）"""
        r = await async_client.post(
            "/api/v1/work/search/global",
            json={"query": "", "limit": 20},
        )
        assert r.status_code == 422

    async def test_global_search_missing_query(self, async_client):
        """缺少必填字段应返回 422"""
        r = await async_client.post(
            "/api/v1/work/search/global",
            json={"limit": 20},
        )
        assert r.status_code == 422

    async def test_global_search_limit_range(self, async_client, mock_search_client):
        """limit 为 1 时应正常工作"""
        mock_search_client.search_global.return_value = {
            "results": [{"id": "c_1", "title": "T", "type": "contract"}],
            "total": 100,
        }

        r = await async_client.post(
            "/api/v1/work/search/global",
            json={"query": "T", "limit": 1},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["data"]["total"] == 100
        assert len(body["data"]["results"]) == 1


class TestSearchAuthenticated:
    """需要认证的端点测试"""

    async def test_global_search_unauthenticated(self, anon_client):
        """未认证用户应返回 401"""
        r = await anon_client.post(
            "/api/v1/work/search/global",
            json={"query": "测试", "limit": 20},
        )
        assert r.status_code != 200  # 401 或 403
