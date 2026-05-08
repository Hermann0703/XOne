"""通知服务 — MongoDB 驱动的用户通知管理

通知存储在 MongoDB xone.notifications 集合中。
支持创建、列表查询、标记已读、未读计数。
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.mongodb import get_mongo_db

logger = logging.getLogger(__name__)


class NotificationManager:
    """用户通知管理器 — 基于 MongoDB 的通知 CRUD。"""

    COLLECTION = "notifications"

    def __init__(self) -> None:
        self._db: AsyncIOMotorDatabase | None = None

    @property
    def db(self) -> AsyncIOMotorDatabase:
        """懒加载获取 MongoDB 数据库实例。"""
        if self._db is None:
            self._db = get_mongo_db()
        return self._db

    @property
    def collection(self):
        """获取 notifications 集合。"""
        return self.db[self.COLLECTION]

    # ── 创建通知 ─────────────────────────────────────────────────

    async def create(
        self,
        user_id: str,
        title: str,
        message: str,
        type: str = "info",
        link: Optional[str] = None,
    ) -> dict:
        """创建一条用户通知。

        Args:
            user_id: 用户ID
            title: 通知标题
            message: 通知内容
            type: 通知类型 (info/warning/error/success)
            link: 可选跳转链接

        Returns:
            创建的通知文档
        """
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": type,
            "link": link,
            "is_read": False,
            "created_at": now,
            "updated_at": now,
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        logger.info("通知已创建: user_id=%s title=%s", user_id, title)
        return doc

    # ── 查询通知列表 ─────────────────────────────────────────────

    async def list(
        self,
        user_id: str,
        limit: int = 50,
        skip: int = 0,
    ) -> dict:
        """查询用户通知列表（按创建时间倒序）。

        Args:
            user_id: 用户ID
            limit: 每页数量（默认 50）
            skip: 跳过条数（分页用）

        Returns:
            {"notifications": [...], "total": int}
        """
        filter_query = {"user_id": user_id}

        total = await self.collection.count_documents(filter_query)

        cursor = (
            self.collection.find(filter_query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        notifications = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            notifications.append(doc)

        return {
            "notifications": notifications,
            "total": total,
        }

    # ── 标记已读 ─────────────────────────────────────────────────

    async def mark_read(self, user_id: str, notification_id: str) -> bool:
        """标记指定通知为已读。

        Args:
            user_id: 用户ID（用于权限校验）
            notification_id: 通知ID（MongoDB ObjectId 字符串）

        Returns:
            是否成功标记
        """
        try:
            obj_id = ObjectId(notification_id)
        except Exception:
            logger.warning("无效的通知ID: %s", notification_id)
            return False

        result = await self.collection.update_one(
            {"_id": obj_id, "user_id": user_id},
            {
                "$set": {
                    "is_read": True,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        if result.modified_count > 0:
            logger.info("通知已标记已读: user_id=%s id=%s", user_id, notification_id)
            return True

        logger.warning("通知标记已读失败（未找到或已读）: user_id=%s id=%s", user_id, notification_id)
        return False

    # ── 未读计数 ─────────────────────────────────────────────────

    async def get_unread_count(self, user_id: str) -> int:
        """获取用户未读通知数量。

        Args:
            user_id: 用户ID

        Returns:
            未读通知数量
        """
        count = await self.collection.count_documents(
            {"user_id": user_id, "is_read": False}
        )
        return count


# 全局单例
_notification_manager: NotificationManager | None = None


def get_notification_manager() -> NotificationManager:
    """获取全局通知管理器单例。"""
    global _notification_manager
    if _notification_manager is None:
        _notification_manager = NotificationManager()
    return _notification_manager
