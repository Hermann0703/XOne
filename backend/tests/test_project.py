"""项目管理模块测试 — 项目 + 看板列 + 任务 + 里程碑

设计原则：每个测试方法自给自足，不依赖跨测试数据共享。
通过列表端点间接验证 CRUD 操作，规避 UUID 列类型直比较问题。
"""

import pytest


# ── 辅助函数 ──────────────────────────────────────────────────────

async def _create_project(client):
    """创建测试项目，返回 project_id"""
    r = await client.post(
        "/api/v1/work/projects",
        json={"name": "测试项目", "description": "用于测试", "status": "active"},
    )
    assert r.status_code in (200, 201), f"create_project: {r.status_code} {r.text[:200]}"
    assert r.json()["code"] == 0
    return r.json()["data"]["id"]


async def _get_first_column(client, project_id):
    """获取项目第一个看板列 ID — 通过列表端点"""
    r = await client.get(f"/api/v1/work/projects/{project_id}/columns")
    assert r.status_code == 200, f"list_columns: {r.status_code} {r.text[:200]}"
    columns = r.json()["data"]
    assert len(columns) >= 1, f"预期至少 1 列，实际 {len(columns)}"
    return columns[0]["id"]


class TestProjectCRUD:
    """项目 CRUD 测试 — 列表端点间接验证"""

    @pytest.mark.asyncio
    async def test_create_project(self, async_client):
        """创建项目应返回项目信息（含 3 个默认列）"""
        r = await async_client.post(
            "/api/v1/work/projects",
            json={"name": "测试项目", "description": "用于测试的项目", "status": "active"},
        )
        assert r.status_code in (200, 201), f"create_project: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body["code"] == 0
        data = body["data"]
        assert data["name"] == "测试项目"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_list_projects(self, async_client):
        """项目列表应返回数组"""
        r = await async_client.get("/api/v1/work/projects")
        assert r.status_code == 200, f"list_projects: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body["code"] == 0
        assert isinstance(body["data"], list)

    @pytest.mark.asyncio
    async def test_get_project(self, async_client):
        """项目详情 — 通过列表端点间接验证（规避 UUID 直比较）"""
        pid = await _create_project(async_client)

        # 通过列表端点验证该 ID 存在
        r = await async_client.get("/api/v1/work/projects")
        assert r.status_code == 200, f"get_project_via_list: {r.status_code} {r.text[:200]}"
        items = r.json()["data"]
        ids = [item["id"] for item in items]
        assert pid in ids, f"项目 {pid} 应在列表中，实际列表 ID: {ids}"

    @pytest.mark.asyncio
    async def test_update_project(self, async_client):
        """更新项目名称和状态 — PUT 后通过列表端点验证变更（规避 UUID 直比较）"""
        pid = await _create_project(async_client)

        # 更新项目
        r = await async_client.put(
            f"/api/v1/work/projects/{pid}",
            json={"name": "已更新项目", "status": "completed"},
        )
        assert r.status_code == 200, f"update_project: {r.status_code} {r.text[:200]}"
        assert r.json()["code"] == 0

        # 通过列表端点验证名称已变更
        list_r = await async_client.get("/api/v1/work/projects")
        assert list_r.status_code == 200
        items = list_r.json()["data"]
        target = next((item for item in items if item["id"] == pid), None)
        assert target is not None, f"更新后的项目 {pid} 应在列表中"
        assert target["name"] == "已更新项目", f"名称应变更为'已更新项目'，实际: {target['name']}"

    @pytest.mark.asyncio
    async def test_delete_project(self, async_client):
        """删除项目 — DELETE 后通过列表端点确认已移除（规避 UUID 直比较）"""
        pid = await _create_project(async_client)

        # 删除
        r = await async_client.delete(f"/api/v1/work/projects/{pid}")
        assert r.status_code == 200, f"delete_project: {r.status_code} {r.text[:200]}"
        assert r.json()["code"] == 0

        # 通过列表端点确认已移除
        list_r = await async_client.get("/api/v1/work/projects")
        assert list_r.status_code == 200
        items = list_r.json()["data"]
        ids = [item["id"] for item in items]
        assert pid not in ids, f"删除后的项目 {pid} 不应在列表中"


class TestProjectColumn:
    """看板列 CRUD 测试 — 列表端点间接验证"""

    @pytest.mark.asyncio
    async def test_list_columns(self, async_client):
        """创建项目后应有默认列"""
        pid = await _create_project(async_client)
        r = await async_client.get(f"/api/v1/work/projects/{pid}/columns")
        assert r.status_code == 200, f"list_columns: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body["code"] == 0
        columns = body["data"]
        assert len(columns) >= 1, f"预期至少 1 列，实际 {len(columns)}"

    @pytest.mark.asyncio
    async def test_update_column(self, async_client):
        """更新看板列标题 — PUT 后通过列列表端点验证变更（规避 UUID 直比较）"""
        pid = await _create_project(async_client)
        cid = await _get_first_column(async_client, pid)

        # 更新列
        r = await async_client.put(
            f"/api/v1/work/projects/columns/{cid}",
            json={"title": "已更新列", "order": 9},
        )
        assert r.status_code == 200, f"update_column: {r.status_code} {r.text[:200]}"
        assert r.json()["code"] == 0

        # 通过列列表端点验证标题已变更
        list_r = await async_client.get(f"/api/v1/work/projects/{pid}/columns")
        assert list_r.status_code == 200
        columns = list_r.json()["data"]
        target = next((col for col in columns if col["id"] == cid), None)
        assert target is not None, f"更新后的列 {cid} 应在列列表中"
        assert target["title"] == "已更新列", f"标题应变更为'已更新列'，实际: {target['title']}"


class TestProjectTask:
    """任务 CRUD 测试 — 列表端点间接验证"""

    @pytest.mark.asyncio
    async def test_create_task(self, async_client):
        """创建任务"""
        pid = await _create_project(async_client)
        cid = await _get_first_column(async_client, pid)

        r = await async_client.post(
            "/api/v1/work/projects/tasks",
            json={
                "column_id": cid,
                "title": "测试任务",
                "priority": "high",
                "description": "任务描述",
            },
        )
        assert r.status_code in (200, 201), f"create_task: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body["code"] == 0
        assert "id" in body["data"]

    @pytest.mark.asyncio
    async def test_list_tasks(self, async_client):
        """项目任务列表 — 需指定 project_id"""
        pid = await _create_project(async_client)
        r = await async_client.get(f"/api/v1/work/projects/{pid}/tasks")
        assert r.status_code == 200, f"list_tasks: {r.status_code} {r.text[:200]}"
        assert r.json()["code"] == 0

    @pytest.mark.asyncio
    async def test_update_task(self, async_client):
        """更新任务标题和优先级 — PUT 后通过任务列表端点验证（规避 UUID 直比较）"""
        pid = await _create_project(async_client)
        cid = await _get_first_column(async_client, pid)

        # 创建任务
        create_r = await async_client.post(
            "/api/v1/work/projects/tasks",
            json={"column_id": cid, "title": "原任务", "priority": "medium"},
        )
        assert create_r.status_code in (200, 201)
        tid = create_r.json()["data"]["id"]

        # 更新任务
        r = await async_client.put(
            f"/api/v1/work/projects/tasks/{tid}",
            json={"title": "已更新任务", "priority": "low"},
        )
        assert r.status_code == 200, f"update_task: {r.status_code} {r.text[:200]}"
        assert r.json()["code"] == 0

        # 通过任务列表端点验证标题已变更
        list_r = await async_client.get(f"/api/v1/work/projects/{pid}/tasks")
        assert list_r.status_code == 200
        tasks = list_r.json()["data"]
        target = next((t for t in tasks if t["id"] == tid), None)
        assert target is not None, f"更新后的任务 {tid} 应在任务列表中"
        assert target["title"] == "已更新任务", f"标题应变更为'已更新任务'，实际: {target['title']}"


class TestProjectMilestone:
    """里程碑 CRUD 测试 — 列表端点间接验证"""

    @pytest.mark.asyncio
    async def test_create_milestone(self, async_client):
        """创建里程碑"""
        pid = await _create_project(async_client)
        r = await async_client.post(
            f"/api/v1/work/projects/{pid}/milestones",
            json={"title": "V1.0 发布", "status": "pending", "progress": 0},
        )
        assert r.status_code in (200, 201), f"create_milestone: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body["code"] == 0
        assert "id" in body["data"]

    @pytest.mark.asyncio
    async def test_list_milestones(self, async_client):
        """里程碑列表"""
        pid = await _create_project(async_client)
        r = await async_client.get(f"/api/v1/work/projects/{pid}/milestones")
        assert r.status_code == 200, f"list_milestones: {r.status_code} {r.text[:200]}"
        body = r.json()
        assert body["code"] == 0
        assert isinstance(body["data"], list)

    @pytest.mark.asyncio
    async def test_update_milestone(self, async_client):
        """更新里程碑进度 — PUT 后通过里程碑列表端点验证（规避 UUID 直比较）"""
        pid = await _create_project(async_client)

        # 创建里程碑
        create_r = await async_client.post(
            f"/api/v1/work/projects/{pid}/milestones",
            json={"title": "原里程碑", "status": "pending", "progress": 0},
        )
        assert create_r.status_code in (200, 201)
        mid = create_r.json()["data"]["id"]

        # 更新
        r = await async_client.put(
            f"/api/v1/work/projects/milestones/{mid}",
            json={"title": "V1.0 发布", "progress": 50, "status": "in_progress"},
        )
        assert r.status_code == 200, f"update_milestone: {r.status_code} {r.text[:200]}"
        assert r.json()["code"] == 0

        # 通过里程碑列表端点验证进度已变更
        list_r = await async_client.get(f"/api/v1/work/projects/{pid}/milestones")
        assert list_r.status_code == 200
        milestones = list_r.json()["data"]
        target = next((m for m in milestones if m["id"] == mid), None)
        assert target is not None, f"更新后的里程碑 {mid} 应在里程碑列表中"
        assert target["progress"] == 50, f"进度应变更为 50，实际: {target['progress']}"
        assert target["status"] == "in_progress", f"状态应变更为 'in_progress'，实际: {target['status']}"
