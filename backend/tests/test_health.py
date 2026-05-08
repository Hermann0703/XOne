"""健康检查模块测试"""


class TestHealth:
    """健康检查端点测试"""

    async def test_health_endpoint(self, anon_client):
        """/health 应返回 ok"""
        r = await anon_client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert "status" in data

    async def test_api_health_endpoint(self, anon_client):
        """/api/v1/health 应返回服务状态"""
        r = await anon_client.get("/api/v1/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["service"] == "xone-api"
        # 在测试环境中 MongoDB 连接可能未初始化，
        # 但端点不应返回 500
