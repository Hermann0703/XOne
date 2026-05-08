"""pytest 配置与共享 fixtures

使用内存 SQLite (aiosqlite) 替代 PostgreSQL，避免外部数据库依赖。
"""

from __future__ import annotations

import asyncio
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import event, String, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.database import Base, get_db
from app.main import app as _app
from app.models.user import User
from app.services.auth_service import AuthService

# ═══════════════════════════════════════════════════════════════════
# SQLite 引擎 — 内存模式，共享连接以便跨 session 可见
# ═══════════════════════════════════════════════════════════════════

TEST_DATABASE_URL = "sqlite+aiosqlite:///file:xone_test?mode=memory&cache=shared&uri=true"

_test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)

TestSessionLocal = async_sessionmaker(
    _test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── 将 PG_UUID 列替换为 String(36) 以兼容 SQLite ────────────────
# 监听 Table 的列附加事件，在 DDL 生成前完成替换。
# 使用 `before_create` 事件修改 metadata 中已注册的 Table。

def _replace_uuid_columns(target, connection, **kw):
    """遍历所有 Table，将 PG_UUID 列替换为 String(36)。"""
    for table in Base.metadata.tables.values():
        for col in list(table.columns):
            if isinstance(col.type, PG_UUID):
                col.type = String(36)

                # 同时替换 server_default（如 gen_random_uuid()）
                if col.server_default is not None:
                    # 移除 PostgreSQL 特定的 server_default，改用 Python 默认
                    col.server_default = None
                    # Python 端默认在模型层面通过 uuid.uuid4 处理：
                    # 我们在创建 User 时手动设置 id


event.listen(Base.metadata, "before_create", _replace_uuid_columns)


# ═══════════════════════════════════════════════════════════════════
# 覆盖 get_db 依赖 — 使用测试引擎
# ═══════════════════════════════════════════════════════════════════

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# 标记：避免重复应用
_override_applied = False


def _ensure_override() -> None:
    global _override_applied
    if not _override_applied:
        # 设置数据库健康状态为 True，绕过 MongoDB 连接检查
        import app.main as main_mod
        main_mod._db_healthy = True
        _app.dependency_overrides[get_db] = override_get_db
        _override_applied = True


# ═══════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════

@pytest_asyncio.fixture(scope="session")
def event_loop():
    """为 session 级 fixture 提供事件循环。"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def _init_db():
    """session 级：创建所有表（仅执行一次）。"""
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session(_init_db) -> AsyncGenerator[AsyncSession, None]:
    """每个测试独立的数据库 session（回滚隔离）。"""
    async with TestSessionLocal() as session:
        # 显式开始事务用于回滚隔离
        async with session.begin():
            yield session
            await session.rollback()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """创建测试用户并返回 User ORM 对象。

    为兼容 SQLite，手动生成 UUID 字符串。
    """
    user = User(
        id=uuid.uuid4(),
        username="testuser",
        email="test@example.com",
        hashed_password=AuthService.hash_password("TestPass123"),
        display_name="测试用户",
        is_active=True,
    )
    # 绕过 server_default via manual assignment
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_token(test_user: User) -> str:
    """为测试用户生成 JWT token。"""
    return AuthService.create_access_token(
        user_id=test_user.id,
        username=test_user.username,
    )


@pytest_asyncio.fixture
async def async_client(db_session, auth_token) -> AsyncGenerator[AsyncClient, None]:
    """提供带依赖覆盖的 AsyncClient。

    将 auth_token 预置于 Authorization header 方便认证端点测试。
    """
    _ensure_override()

    transport = ASGITransport(app=_app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {auth_token}"},
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def anon_client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """无需认证的 AsyncClient（用于测试未登录场景）。"""
    _ensure_override()

    transport = ASGITransport(app=_app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as ac:
        yield ac
