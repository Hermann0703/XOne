"""通知模块测试 — 列表 / 未读计数 / 标记已读

通知模块使用 MongoDB，测试时 Mock get_notification_manager
提供基于 dict 的 FakeNotificationManager。
"""

from __future__ import annotations

import pytest
from typing import Optional
from unittest.mock import patch
from uuid import uuid4
from datetime import datetime, timezone

NOTIF_PREFIX = "/api/v1/personal/notifications"


# ── Fake NotificationManager (in-memory dict) ───────────────

class FakeNotificationManager:
    """基于 dict 的假通知管理器，模拟 NotificationManager 接口"""

    def __init__(self):
        self._notifications = {}

    async def create(
        self,
        user_id,
        title: str,
        message: str,
        type: str = "info",
        link: Optional[str] = None,
    ) -> dict:
        doc_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "_id": doc_id,
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": type,
            "link": link,
            "is_read": False,
            "created_at": now,
        }
        self._notifications[doc_id] = doc
        return doc

    async def list(self, user_id, limit: int = 50, skip: int = 0) -> dict:
        user_notifs = [
            d for d in self._notifications.values() if d["user_id"] == user_id
        ]
        user_notifs.sort(key=lambda d: d["created_at"], reverse=True)
        total = len(user_notifs)
        page = user_notifs[skip : skip + limit]
        return {"notifications": page, "total": total}

    async def mark_read(self, user_id, notification_id: str) -> bool:
        doc = self._notifications.get(notification_id)
        if doc and doc["user_id"] == user_id and not doc["is_read"]:
            doc["is_read"] = True
            return True
        return False

    async def get_unread_count(self, user_id) -> int:
        return sum(
            1
            for d in self._notifications.values()
            if d["user_id"] == user_id and not d["is_read"]
        )


def _fake_mgr():
    return _fake_mgr._instance


# ── 辅助：创建带 mock 的 async_client ──────────────────────

@pytest.fixture
async def notif_client(async_client):
    """返回已 mock get_notification_manager 的 async_client。

    在每个测试中创建独立的 FakeNotificationManager 实例，
    确保测试之间数据完全隔离。
    """
    _fake_mgr._instance = FakeNotificationManager()

    with patch(
        "app.api.personal.notifications.get_notification_manager",
        side_effect=_fake_mgr,
    ):
        yield async_client


# ── 列表接口 ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_empty(notif_client):
    """空通知列表：新用户应返回空列表和 total=0"""
    r = await notif_client.get(NOTIF_PREFIX)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["notifications"] == []
    assert body["total"] == 0


@pytest.mark.asyncio
async def test_list_with_notifications(notif_client):
    """创建通知后列表应正确返回"""
    mgr = _fake_mgr._instance
    for i in range(3):
        await mgr.create(
            user_id="default",
            title=f"通知标题 {i}",
            message=f"通知内容 {i}",
            type="info",
        )

    r = await notif_client.get(NOTIF_PREFIX)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 3
    assert len(body["notifications"]) == 3
    titles = {n["title"] for n in body["notifications"]}
    assert titles == {"通知标题 0", "通知标题 1", "通知标题 2"}

    # 字段完整性
    first = body["notifications"][0]
    assert "_id" in first
    assert first["user_id"] == "default"
    assert "title" in first
    assert "message" in first
    assert "type" in first
    assert "is_read" in first
    assert "created_at" in first


@pytest.mark.asyncio
async def test_list_pagination(notif_client):
    """分页：limit 和 offset 应正确工作"""
    mgr = _fake_mgr._instance
    for i in range(10):
        await mgr.create(
            user_id="default",
            title=f"分页通知 {i:02d}",
            message=f"第 {i} 条消息",
        )

    # 第一页：limit=3, offset=0
    r = await notif_client.get(f"{NOTIF_PREFIX}?limit=3&offset=0")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 10
    assert len(body["notifications"]) == 3

    # 第二页：limit=3, offset=3 — 不应与第一页重叠
    r2 = await notif_client.get(f"{NOTIF_PREFIX}?limit=3&offset=3")
    assert r2.status_code == 200
    page1_ids = {n["_id"] for n in body["notifications"]}
    page2_ids = {n["_id"] for n in r2.json()["notifications"]}
    assert page1_ids.isdisjoint(page2_ids)

    # 最后一页可能不足 limit
    r3 = await notif_client.get(f"{NOTIF_PREFIX}?limit=3&offset=9")
    assert r3.status_code == 200
    assert len(r3.json()["notifications"]) == 1


@pytest.mark.asyncio
async def test_list_user_isolation(notif_client):
    """不同用户的通知应隔离"""
    mgr = _fake_mgr._instance
    await mgr.create(user_id="user_a", title="A的通知", message="仅A")
    await mgr.create(user_id="user_a", title="A的第二条", message="仅A")
    await mgr.create(user_id="user_b", title="B的通知", message="仅B")

    # 默认用户 (user_id="default") 应看不到任何通知
    r = await notif_client.get(NOTIF_PREFIX)
    assert r.status_code == 200
    assert r.json()["total"] == 0

    # user_a 应看到 2 条
    r = await notif_client.get(f"{NOTIF_PREFIX}?user_id=user_a")
    assert r.status_code == 200
    assert r.json()["total"] == 2

    # user_b 应看到 1 条
    r = await notif_client.get(f"{NOTIF_PREFIX}?user_id=user_b")
    assert r.status_code == 200
    assert r.json()["total"] == 1


# ── 未读计数 ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_unread_count_zero(notif_client):
    """无通知时未读计数应为 0"""
    r = await notif_client.get(f"{NOTIF_PREFIX}/unread-count")
    assert r.status_code == 200, r.text
    assert r.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_unread_count_with_mixed(notif_client):
    """混合已读/未读时的计数"""
    mgr = _fake_mgr._instance
    # 创建 3 条未读
    for i in range(3):
        await mgr.create(user_id="default", title=f"未读 {i}", message="...")

    # 创建 2 条并标记为已读
    for i in range(2):
        doc = await mgr.create(user_id="default", title=f"已读 {i}", message="...")
        await mgr.mark_read(user_id="default", notification_id=doc["_id"])

    r = await notif_client.get(f"{NOTIF_PREFIX}/unread-count")
    assert r.status_code == 200, r.text
    assert r.json()["unread_count"] == 3


# ── 标记已读 ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mark_read_success(notif_client):
    """标记已读成功后应返回成功消息，且未读计数减少"""
    mgr = _fake_mgr._instance
    doc = await mgr.create(user_id="default", title="测试通知", message="内容")

    r = await notif_client.put(f"{NOTIF_PREFIX}/{doc['_id']}/read")
    assert r.status_code == 200, r.text
    assert r.json()["message"] == "已标记为已读"

    # 确认已读状态
    stored = mgr._notifications[doc["_id"]]
    assert stored["is_read"] is True

    # 未读计数应减为 0
    r = await notif_client.get(f"{NOTIF_PREFIX}/unread-count")
    assert r.json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_mark_read_nonexistent(notif_client):
    """标记不存在的通知应返回 404"""
    r = await notif_client.put(f"{NOTIF_PREFIX}/nonexistent-id/read")
    assert r.status_code == 404, r.text
    assert "不存在" in r.json()["detail"]


@pytest.mark.asyncio
async def test_mark_read_already_read(notif_client):
    """重复标记已读应返回 404（服务端视为"不存在或已读"）"""
    mgr = _fake_mgr._instance
    doc = await mgr.create(user_id="default", title="待读", message="...")

    # 第一次标记 — 成功
    r = await notif_client.put(f"{NOTIF_PREFIX}/{doc['_id']}/read")
    assert r.status_code == 200

    # 第二次标记 — 404
    r = await notif_client.put(f"{NOTIF_PREFIX}/{doc['_id']}/read")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_mark_read_wrong_user(notif_client):
    """用户只能标记自己的通知为已读"""
    mgr = _fake_mgr._instance
    doc = await mgr.create(user_id="other_user", title="他人的通知", message="...")

    # 默认用户尝试标记他人的通知 — 应404
    r = await notif_client.put(f"{NOTIF_PREFIX}/{doc['_id']}/read")
    assert r.status_code == 404

    # 原用户标记应成功
    r = await notif_client.put(
        f"{NOTIF_PREFIX}/{doc['_id']}/read?user_id=other_user"
    )
    assert r.status_code == 200
