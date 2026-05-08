"""认证模块测试 — 注册 / 登录 / 当前用户"""

import pytest


class TestAuthRegister:
    """用户注册测试"""

    async def test_register_success(self, anon_client):
        """注册成功应返回用户信息和 JWT token"""
        response = await anon_client.post(
            "/api/v1/auth/register",
            json={
                "username": "newuser",
                "email": "new@example.com",
                "password": "SecurePass123",
                "display_name": "新用户",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "newuser"
        assert data["user"]["email"] == "new@example.com"
        assert data["user"]["display_name"] == "新用户"
        assert data["user"]["is_active"] is True

    async def test_register_duplicate_username(self, anon_client):
        """重复用户名注册应返回 409"""
        # 第一次注册
        await anon_client.post(
            "/api/v1/auth/register",
            json={
                "username": "dupuser",
                "email": "dup1@example.com",
                "password": "SecurePass123",
            },
        )
        # 第二次使用相同用户名
        response = await anon_client.post(
            "/api/v1/auth/register",
            json={
                "username": "dupuser",
                "email": "dup2@example.com",
                "password": "SecurePass123",
            },
        )
        assert response.status_code == 409
        assert "用户名已存在" in response.json()["detail"]

    async def test_register_duplicate_email(self, anon_client):
        """重复邮箱注册应返回 409"""
        await anon_client.post(
            "/api/v1/auth/register",
            json={
                "username": "user1",
                "email": "same@example.com",
                "password": "SecurePass123",
            },
        )
        response = await anon_client.post(
            "/api/v1/auth/register",
            json={
                "username": "user2",
                "email": "same@example.com",
                "password": "SecurePass123",
            },
        )
        assert response.status_code == 409
        assert "邮箱已被注册" in response.json()["detail"]

    async def test_register_short_username(self, anon_client):
        """过短用户名应返回 422"""
        response = await anon_client.post(
            "/api/v1/auth/register",
            json={
                "username": "ab",
                "email": "short@example.com",
                "password": "SecurePass123",
            },
        )
        assert response.status_code == 422

    async def test_register_short_password(self, anon_client):
        """过短密码应返回 422"""
        response = await anon_client.post(
            "/api/v1/auth/register",
            json={
                "username": "validuser",
                "email": "valid@example.com",
                "password": "12345",
            },
        )
        assert response.status_code == 422


class TestAuthLogin:
    """用户登录测试"""

    async def test_login_success(self, anon_client):
        """正确凭据登录应返回 token"""
        # 先注册
        await anon_client.post(
            "/api/v1/auth/register",
            json={
                "username": "loginuser",
                "email": "login@example.com",
                "password": "LoginPass123",
            },
        )
        # 登录
        response = await anon_client.post(
            "/api/v1/auth/login",
            json={
                "username": "loginuser",
                "password": "LoginPass123",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "loginuser"

    async def test_login_wrong_password(self, anon_client):
        """错误密码应返回 401"""
        # 注册
        await anon_client.post(
            "/api/v1/auth/register",
            json={
                "username": "wrongpw",
                "email": "wrongpw@example.com",
                "password": "CorrectPass123",
            },
        )
        # 尝试错误密码
        response = await anon_client.post(
            "/api/v1/auth/login",
            json={
                "username": "wrongpw",
                "password": "WrongPassword1",
            },
        )
        assert response.status_code == 401
        assert "用户名或密码错误" in response.json()["detail"]

    async def test_login_nonexistent_user(self, anon_client):
        """不存在的用户应返回 401"""
        response = await anon_client.post(
            "/api/v1/auth/login",
            json={
                "username": "nobody",
                "password": "SomePass123",
            },
        )
        assert response.status_code == 401


class TestAuthMe:
    """当前用户信息测试"""

    async def test_me_authenticated(self, async_client):
        """带有效 token 应返回用户信息"""
        response = await async_client.get("/api/v1/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"

    async def test_me_unauthenticated(self, anon_client):
        """无 token 应返回 401"""
        response = await anon_client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_me_invalid_token(self, anon_client):
        """无效 token 应返回 401"""
        response = await anon_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"},
        )
        assert response.status_code == 401
