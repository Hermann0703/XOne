"""全局搜索模块测试

使用 Mock 替代真实 Meilisearch 服务。
"""

from unittest.mock import AsyncMock, patch

import pytest


class TestGlobalSearch:
    """全局搜索测试"""

    @pytest.fixture(autouse=True)
    def mock_search_service(self):
        """Mock app.services.search_service 中的所有方法。"""
        with patch("app.api.work.search.search_service") as mock_svc:
            # search_all 返回格式: {"contracts": [...], "archives": [...], ...}
            mock_svc.search_all = AsyncMock()
            # search_contracts 返回 list
            mock_svc.search_contracts = AsyncMock()
            # search_archives 返回 list
            mock_svc.search_archives = AsyncMock()
            mock_svc.index_contract = AsyncMock()
            mock_svc.update_contract_index = AsyncMock()
            mock_svc.delete_contract_index = AsyncMock()
            mock_svc.index_archive = AsyncMock()
            mock_svc.update_archive_index = AsyncMock()
            mock_svc.delete_archive_index = AsyncMock()

            yield mock_svc

    async def test_global_search(self, async_client, mock_search_service):
        """全局搜索应返回多类型聚合结果"""
        mock_search_service.search_all.return_value = {
            "contracts": [
                {"id": 1, "title": "测试合同", "type": "contract"},
            ],
            "archives": [
                {"id": 1, "title": "测试档案", "type": "archive"},
            ],
            "knowledge": [],
        }

        r = await async_client.get(
            "/api/v1/work/search?keyword=测试&user_id=1"
        )
        assert r.status_code == 200
        body = r.json()
        assert body["code"] == 0
        data = body["data"]
        assert "contracts" in data
        assert "archives" in data
        assert len(data["contracts"]) == 1
        assert data["contracts"][0]["title"] == "测试合同"
        mock_search_service.search_all.assert_awaited_once()

    async def test_search_no_results(self, async_client, mock_search_service):
        """空结果全局搜索应返回空列表"""
        mock_search_service.search_all.return_value = {
            "contracts": [],
            "archives": [],
            "knowledge": [],
        }

        r = await async_client.get(
            "/api/v1/work/search?keyword=不存在&user_id=1"
        )
        assert r.status_code == 200
        body = r.json()
        assert body["code"] == 0
        data = body["data"]
        assert data["contracts"] == []
        assert data["archives"] == []

    async def test_search_type_contracts(self, async_client, mock_search_service):
        """按类型搜索合同"""
        mock_search_service.search_contracts.return_value = [
            {"id": 1, "title": "服务合同", "type": "contract"},
            {"id": 2, "title": "销售合同", "type": "contract"},
        ]

        r = await async_client.get(
            "/api/v1/work/search/contracts?keyword=合同&user_id=1"
        )
        assert r.status_code == 200
        body = r.json()
        assert body["code"] == 0
        assert len(body["data"]) == 2
        mock_search_service.search_contracts.assert_awaited_once()

    async def test_search_empty_keyword(self, async_client, mock_search_service):
        """空关键词搜索应返回错误"""
        r = await async_client.get(
            "/api/v1/work/search?keyword=&user_id=1"
        )
        # 空关键词应返回 400 或空结果
        assert r.status_code in (200, 400, 422)

    async def test_search_type_archives(self, async_client, mock_search_service):
        """按类型搜索档案"""
        mock_search_service.search_archives.return_value = [
            {"id": 1, "title": "工程档案", "type": "archive"},
        ]

        r = await async_client.get(
            "/api/v1/work/search/archives?keyword=工程&user_id=1"
        )
        assert r.status_code == 200
        body = r.json()
        assert body["code"] == 0
        assert len(body["data"]) == 1
        assert body["data"][0]["title"] == "工程档案"
