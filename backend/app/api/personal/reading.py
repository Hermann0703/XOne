"""阅读模块API路由 — 书籍管理端点"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import reading_service

router = APIRouter(prefix="/reading", tags=["个人-阅读"])


# ── Pydantic schemas ──────────────────────────────────────────────

class BookCreate(BaseModel):
    """创建书籍请求体"""
    title: str = Field(..., description="书名")
    author: Optional[str] = Field(None, description="作者")
    isbn: Optional[str] = Field(None, description="ISBN")
    publisher: Optional[str] = Field(None, description="出版社")
    publish_year: Optional[int] = Field(None, description="出版年份")
    cover_url: Optional[str] = Field(None, description="封面图片URL")
    douban_url: Optional[str] = Field(None, description="豆瓣链接")
    status: str = Field("want_to_read", description="阅读状态: want_to_read/reading/done/dropped")
    rating: Optional[int] = Field(None, ge=1, le=5, description="评分 1-5")
    total_pages: Optional[int] = Field(None, description="总页数")
    current_page: Optional[int] = Field(None, description="当前页码")
    start_date: Optional[str] = Field(None, description="开始阅读日期")
    finish_date: Optional[str] = Field(None, description="完成阅读日期")
    tags: Optional[str] = Field(None, description="标签，逗号分隔")
    notes: Optional[str] = Field(None, description="笔记")


class BookUpdate(BaseModel):
    """更新书籍请求体（全部字段可选）"""
    title: Optional[str] = Field(None, description="书名")
    author: Optional[str] = Field(None, description="作者")
    isbn: Optional[str] = Field(None, description="ISBN")
    publisher: Optional[str] = Field(None, description="出版社")
    publish_year: Optional[int] = Field(None, description="出版年份")
    cover_url: Optional[str] = Field(None, description="封面图片URL")
    douban_url: Optional[str] = Field(None, description="豆瓣链接")
    status: Optional[str] = Field(None, description="阅读状态")
    rating: Optional[int] = Field(None, ge=1, le=5, description="评分 1-5")
    total_pages: Optional[int] = Field(None, description="总页数")
    current_page: Optional[int] = Field(None, description="当前页码")
    start_date: Optional[str] = Field(None, description="开始阅读日期")
    finish_date: Optional[str] = Field(None, description="完成阅读日期")
    tags: Optional[str] = Field(None, description="标签")
    notes: Optional[str] = Field(None, description="笔记")


# ── 端点 ──────────────────────────────────────────────────────────

@router.get("/books", summary="获取书籍列表")
async def list_books(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="按状态筛选"),
    tag: Optional[str] = Query(None, description="按标签筛选"),
    search: Optional[str] = Query(None, description="按书名/作者搜索"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询用户的书籍列表"""
    result = await reading_service.list_books(
        db=db, user_id=current_user.id, page=page, size=size,
        status=status, tag=tag, search=search,
    )
    return {"message": "查询成功", "data": result}


@router.post("/books", summary="添加书籍", status_code=201)
async def create_book(
    current_user: User = Depends(get_current_user),
    data: BookCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """创建新的书籍记录"""
    book = await reading_service.create_book(
        db=db, user_id=current_user.id, data=data.model_dump(exclude_none=True),
    )
    return {"message": "添加成功", "data": book}


@router.get("/books/{book_id}", summary="获取书籍详情")
async def get_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单本书籍的详细信息"""
    from sqlalchemy import select
    result = await db.execute(
        select(reading_service.Book).where(
            reading_service.Book.id == book_id,
            reading_service.Book.user_id == current_user.id,
        )
    )
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")
    return {"message": "查询成功", "data": book}


@router.patch("/books/{book_id}", summary="更新书籍")
async def update_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    data: BookUpdate = ...,
    db: AsyncSession = Depends(get_db),
):
    """更新书籍信息，仅允许更新自己的书籍"""
    book = await reading_service.update_book(
        db=db, book_id=book_id, user_id=current_user.id,
        data=data.model_dump(exclude_none=True),
    )
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在或无权操作")
    return {"message": "更新成功", "data": book}


@router.delete("/books/{book_id}", summary="删除书籍")
async def delete_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除书籍记录，仅允许删除自己的书籍"""
    deleted = await reading_service.delete_book(
        db=db, book_id=book_id, user_id=current_user.id,
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="书籍不存在或无权操作")
    return {"message": "删除成功"}
