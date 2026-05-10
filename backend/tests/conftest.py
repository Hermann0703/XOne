"""pytest fixtures — module scope, before_create 仅改 type+server_default

已验证模式：
- before_create 事件：只改 col.type=String(36) 和 col.server_default=text(...)
- 不碰 col.default（触发元数据递归死循环）
- sqlite3.register_adapter 处理 ORM default=uuid.uuid4 生成的 UUID 对象
- async_sessionmaker 用 class_=AsyncSession 关键字
"""
from __future__ import annotations

import asyncio
import sqlite3
import uuid
from typing import AsyncGenerator

sqlite3.register_adapter(uuid.UUID, lambda u: str(u))

import pytest
import pytest_asyncio
from fastapi import Depends, HTTPException, status
from httpx import AsyncClient, ASGITransport
from sqlalchemy import event, String, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import oauth2_scheme, get_current_user
from app.main import app as _app
from app.models.user import User
from app.services.auth_service import AuthService

TEST_DATABASE_URL = "sqlite+aiosqlite:///file:xone_test?mode=memory&cache=shared&uri=true"
_auth_svc = AuthService()

# ═══ UUID 列补丁（before_create）════
def _patch_uuid_columns(target, connection, **kw):
    """仅改 column type + server_default + insert_sentinel，不动 col.default"""
    for t in Base.metadata.tables.values():
        for c in list(t.columns):
            if isinstance(c.type, PG_UUID):
                c.type = String(36)
                if c.server_default is not None:
                    c.server_default = text("(lower(hex(randomblob(16))))")
                # 禁止 RETURNING sentinel 匹配（SQLite 字符串/UUID不兼容）
                try:
                    setattr(c, '_fallback_insert_sentinel', False)
                except (AttributeError, TypeError):
                    pass

event.listen(Base.metadata, "before_create", _patch_uuid_columns)

# ═══ 依赖覆盖 ═════
_ref_session: AsyncSession | None = None
_override_done = False

async def _shared_get_db():
    yield _ref_session

async def _test_get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = _auth_svc.decode_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="凭证无效")
    user = await db.get(User, payload.get("sub"))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")
    return user

# ═══ Module-scope fixtures ═══

@pytest_asyncio.fixture(scope="module")
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL, echo=False)
    # 禁用 insertmanyvalues 优化（SQLite UUID 字符串与 sentinel 不兼容）
    eng.sync_engine.dialect.use_insertmanyvalues = False
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture(scope="module")
async def async_session(engine):
    global _ref_session
    fac = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    _ref_session = fac()
    yield _ref_session
    await _ref_session.rollback()
    await _ref_session.close()


@pytest_asyncio.fixture(scope="module")
async def test_user(async_session: AsyncSession):
    user = User(
        id=str(uuid.uuid4()),
        username="testuser",
        email="test@example.com",
        hashed_password=AuthService.hash_password("TestPass123"),
        display_name="测试用户",
        is_active=True,
    )
    async_session.add(user)
    await async_session.flush()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="module")
async def auth_token(test_user: User):
    global _override_done
    token = _auth_svc.create_access_token(
        user_id=str(test_user.id), username=test_user.username
    )
    if not _override_done:
        _app.dependency_overrides[get_db] = _shared_get_db
        _app.dependency_overrides[get_current_user] = _test_get_current_user
        _override_done = True
    return token


@pytest_asyncio.fixture(scope="module")
async def async_client(auth_token: str) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=_app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {auth_token}"},
    ) as ac:
        yield ac


@pytest_asyncio.fixture(scope="module")
async def anon_client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
