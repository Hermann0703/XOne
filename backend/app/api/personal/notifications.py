"""通知 API — 用户通知管理端点

端点:
  GET  /notifications            — 当前用户通知列表
  GET  /notifications/unread-count — 未读通知数
  PUT  /notifications/{id}/read  — 标记已读
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Header, Depends
from pydantic import BaseModel, Field

from app.services.notification_service import (
    get_notification_manager,
    NotificationManager,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["通知"])


# ── 当前用户依赖 ──────────────────────────────────────────────────

async def get_current_user_id(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-ID"),
    user_id: Optional[str] = Query(default=None, description="用户ID（兼容查询参数）"),
) -> str:
    """获取当前用户ID。

    优先从 X-User-ID 请求头读取，其次从查询参数 user_id 读取，
    均无则使用默认值 "default"。
    """
    uid = x_user_id or user_id or "default"
    return uid


# ── Pydantic Schemas ──────────────────────────────────────────────

class NotificationItem(BaseModel):
    """通知条目"""
    id: str = Field(..., description="通知ID")
    user_id: str = Field(..., description="用户ID")
    title: str = Field(..., description="通知标题")
    message: str = Field(..., description="通知内容")
    type: str = Field(default="info", description="通知类型")
    link: Optional[str] = Field(default=None, description="跳转链接")
    is_read: bool = Field(default=False, description="是否已读")
    created_at: str = Field(..., description="创建时间")


class NotificationListResponse(BaseModel):
    """通知列表响应"""
    notifications: list[dict] = Field(default_factory=list, description="通知列表")
    total: int = Field(default=0, description="通知总数")


class UnreadCountResponse(BaseModel):
    """未读计数响应"""
    unread_count: int = Field(default=0, description="未读通知数量")


class MarkReadResponse(BaseModel):
    """标记已读响应"""
    message: str = Field(default="已标记为已读", description="操作结果")


# ── API 端点 ──────────────────────────────────────────────────────

@router.get("", response_model=NotificationListResponse, summary="通知列表")
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=200, description="每页数量"),
    offset: int = Query(default=0, ge=0, description="偏移量"),
    user_id: str = Depends(get_current_user_id),
):
    """获取当前用户的通知列表，按创建时间倒序排列。"""
    mgr = get_notification_manager()
    try:
        result = await mgr.list(user_id=user_id, limit=limit, skip=offset)
        return NotificationListResponse(**result)
    except Exception as e:
        logger.exception("获取通知列表失败: user_id=%s", user_id)
        raise HTTPException(status_code=500, detail=f"获取通知列表失败: {str(e)}")


@router.get("/unread-count", response_model=UnreadCountResponse, summary="未读通知数")
async def unread_count(
    user_id: str = Depends(get_current_user_id),
):
    """获取当前用户的未读通知数量。"""
    mgr = get_notification_manager()
    try:
        count = await mgr.get_unread_count(user_id=user_id)
        return UnreadCountResponse(unread_count=count)
    except Exception as e:
        logger.exception("获取未读计数失败: user_id=%s", user_id)
        raise HTTPException(status_code=500, detail=f"获取未读计数失败: {str(e)}")


@router.put("/{notification_id}/read", response_model=MarkReadResponse, summary="标记已读")
async def mark_notification_read(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """将指定通知标记为已读。"""
    mgr = get_notification_manager()
    try:
        success = await mgr.mark_read(user_id=user_id, notification_id=notification_id)
        if not success:
            raise HTTPException(
                status_code=404,
                detail="通知不存在或已读",
            )
        return MarkReadResponse(message="已标记为已读")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("标记已读失败: user_id=%s id=%s", user_id, notification_id)
        raise HTTPException(status_code=500, detail=f"标记已读失败: {str(e)}")
