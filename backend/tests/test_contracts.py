"""合同管理模块测试 — 合同 CRUD

合同依赖全宗/分类/密级，测试前需先创建这些关联实体。
"""

import pytest


# ── 辅助函数：创建合同前置数据 ─────────────────────────────────

async def _create_prerequisites(client):
    """创建全宗 + 分类 + 密级，返回其 ID。"""
    # 创建全宗
    r = await client.post("/api/v1/work/contracts/fonds", json={
        "name": "测试全宗", "code": "TEST_FONDS", "description": "测试用全宗",
    })
    assert r.status_code == 200, f"创建全宗失败: {r.text}"
    fonds_id = r.json()["data"]["id"]

    # 创建分类
    r = await client.post("/api/v1/work/contracts/categories", json={
        "name": "测试分类", "code": "TEST_CAT", "fonds_id": fonds_id,
    })
    assert r.status_code == 200, f"创建分类失败: {r.text}"
    category_id = r.json()["data"]["id"]

    # 创建密级
    r = await client.post("/api/v1/work/contracts/classifications", json={
        "name": "内部", "code": "INTERNAL", "level": 2,
    })
    assert r.status_code == 200, f"创建密级失败: {r.text}"
    classification_id = r.json()["data"]["id"]

    return fonds_id, category_id, classification_id


async def _create_contract(client, fonds_id, category_id, classification_id,
                           contract_no="CT-2024-001", title="测试合同"):
    """创建一条合同记录，返回响应 data。"""
    r = await client.post(
        f"/api/v1/work/contracts/contracts?user_id=1",
        json={
            "contract_no": contract_no,
            "title": title,
            "fonds_id": fonds_id,
            "category_id": category_id,
            "classification_id": classification_id,
            "party_a": "甲方公司",
            "party_b": "乙方公司",
            "amount": 100000.00,
            "currency": "CNY",
            "status": "draft",
            "contract_type": "service",
        },
    )
    assert r.status_code == 200, f"创建合同失败: {r.text}"
    return r.json()["data"]


# ═══════════════════════════════════════════════════════════════════
# 测试类
# ═══════════════════════════════════════════════════════════════════

class TestContractCRUD:
    """合同 CRUD 完整流程测试"""

    @pytest.fixture(autouse=True)
    async def setup(self, async_client):
        """每个测试前创建前置数据。"""
        self.client = async_client
        self.fonds_id, self.category_id, self.classification_id = \
            await _create_prerequisites(async_client)

    async def test_create_contract(self):
        """创建合同应返回合同数据"""
        data = await _create_contract(
            self.client, self.fonds_id, self.category_id, self.classification_id,
        )
        assert data["contract_no"] == "CT-2024-001"
        assert data["title"] == "测试合同"
        assert data["party_a"] == "甲方公司"
        assert data["party_b"] == "乙方公司"
        assert data["amount"] == 100000.00
        assert data["currency"] == "CNY"
        assert data["status"] == "draft"
        assert data["contract_type"] == "service"
        assert data["fonds"]["name"] == "测试全宗"
        assert data["category"]["name"] == "测试分类"
        assert data["classification"]["name"] == "内部"

    async def test_list_contracts(self):
        """列表查询应返回合同列表含分页"""
        # 创建两条合同
        await _create_contract(
            self.client, self.fonds_id, self.category_id, self.classification_id,
            contract_no="CT-2024-001", title="合同A",
        )
        await _create_contract(
            self.client, self.fonds_id, self.category_id, self.classification_id,
            contract_no="CT-2024-002", title="合同B",
        )

        r = await self.client.get(
            f"/api/v1/work/contracts/contracts?user_id=1&page=1&page_size=20"
        )
        assert r.status_code == 200
        body = r.json()
        assert body["code"] == 0
        assert len(body["data"]) == 2
        assert body["paging"]["total"] == 2

    async def test_list_contracts_filter_by_status(self):
        """按状态筛选合同"""
        await _create_contract(
            self.client, self.fonds_id, self.category_id, self.classification_id,
            contract_no="CT-2024-A", title="草稿合同",
        )
        await _create_contract(
            self.client, self.fonds_id, self.category_id, self.classification_id,
            contract_no="CT-2024-B", title="已完成合同",
        )

        # 单独更新第二条合同状态
        r_list = await self.client.get(
            f"/api/v1/work/contracts/contracts?user_id=1"
        )
        contracts = r_list.json()["data"]
        contract_b = [c for c in contracts if c["contract_no"] == "CT-2024-B"][0]
        await self.client.patch(
            f"/api/v1/work/contracts/contracts/{contract_b['id']}?user_id=1",
            json={"status": "completed"},
        )

        # 按 status=draft 筛选
        r = await self.client.get(
            f"/api/v1/work/contracts/contracts?user_id=1&status=draft"
        )
        assert r.status_code == 200
        assert len(r.json()["data"]) == 1
        assert r.json()["data"][0]["contract_no"] == "CT-2024-A"

    async def test_get_contract(self):
        """合同详情查询应返回含里程碑的信息"""
        data = await _create_contract(
            self.client, self.fonds_id, self.category_id, self.classification_id,
        )
        contract_id = data["id"]

        r = await self.client.get(
            f"/api/v1/work/contracts/contracts/{contract_id}?user_id=1"
        )
        assert r.status_code == 200
        body = r.json()
        assert body["code"] == 0
        assert body["data"]["id"] == contract_id
        assert body["data"]["contract_no"] == "CT-2024-001"
        assert "milestones" in body["data"]

    async def test_get_contract_not_found(self):
        """查询不存在的合同应返回 404"""
        r = await self.client.get("/api/v1/work/contracts/contracts/99999?user_id=1")
        assert r.status_code == 404
        assert "合同不存在" in r.json()["detail"]

    async def test_update_contract(self):
        """更新合同信息应生效"""
        data = await _create_contract(
            self.client, self.fonds_id, self.category_id, self.classification_id,
        )
        contract_id = data["id"]

        r = await self.client.patch(
            f"/api/v1/work/contracts/contracts/{contract_id}?user_id=1",
            json={
                "title": "更新后的合同标题",
                "amount": 200000.00,
                "status": "signed",
            },
        )
        assert r.status_code == 200
        updated = r.json()["data"]
        assert updated["title"] == "更新后的合同标题"
        assert updated["amount"] == 200000.00
        assert updated["status"] == "signed"

    async def test_update_contract_not_found(self):
        """更新不存在的合同应返回 404"""
        r = await self.client.patch(
            "/api/v1/work/contracts/contracts/99999?user_id=1",
            json={"title": "不存在"},
        )
        assert r.status_code == 404

    async def test_delete_contract(self):
        """删除合同后查询应返回 404"""
        data = await _create_contract(
            self.client, self.fonds_id, self.category_id, self.classification_id,
        )
        contract_id = data["id"]

        r = await self.client.delete(
            f"/api/v1/work/contracts/contracts/{contract_id}?user_id=1"
        )
        assert r.status_code == 200
        assert r.json()["code"] == 0

        # 确认已删除
        r = await self.client.get(
            f"/api/v1/work/contracts/contracts/{contract_id}?user_id=1"
        )
        assert r.status_code == 404

    async def test_delete_contract_not_found(self):
        """删除不存在的合同应返回 404"""
        r = await self.client.delete("/api/v1/work/contracts/contracts/99999?user_id=1")
        assert r.status_code == 404

    async def test_search_contracts(self):
        """搜索合同应按标题/关键词匹配"""
        await _create_contract(
            self.client, self.fonds_id, self.category_id, self.classification_id,
            contract_no="CT-SEARCH-1", title="软件开发合同",
        )
        await _create_contract(
            self.client, self.fonds_id, self.category_id, self.classification_id,
            contract_no="CT-SEARCH-2", title="硬件采购合同",
        )

        r = await self.client.get(
            "/api/v1/work/contracts/contracts?user_id=1&search=软件"
        )
        assert r.status_code == 200
        results = r.json()["data"]
        assert len(results) == 1
        assert results[0]["title"] == "软件开发合同"
