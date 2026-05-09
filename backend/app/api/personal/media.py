"""观影模块API路由 — 影视管理端点"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import media_service

router = APIRouter(prefix="/media", tags=["个人-观影"])


# ── Pydantic schemas ──────────────────────────────────────────────

class MovieCreate(BaseModel):
    """创建影视记录请求体"""
    title: str = Field(..., description="中文片名")
    title_en: Optional[str] = Field(None, description="英文片名")
    year: Optional[int] = Field(None, description="年份")
    director: Optional[str] = Field(None, description="导演")
    genre: Optional[str] = Field(None, description="类型")
    country: Optional[str] = Field(None, description="国家/地区")
    poster_url: Optional[str] = Field(None, description="海报URL")
    tmdb_url: Optional[str] = Field(None, description="TMDB链接")
    douban_url: Optional[str] = Field(None, description="豆瓣链接")
    status: str = Field("want_to_watch", description="观影状态: want_to_watch/watching/watched/dropped")
    rating: Optional[int] = Field(None, ge=1, le=5, description="评分 1-5")
    duration_minutes: Optional[int] = Field(None, description="时长（分钟）")
    watch_date: Optional[str] = Field(None, description="观看日期")
    my_review: Optional[str] = Field(None, description="我的评价")
    tags: Optional[str] = Field(None, description="标签，逗号分隔")


class MovieUpdate(BaseModel):
    """更新影视记录请求体（全部字段可选）"""
    title: Optional[str] = Field(None, description="中文片名")
    title_en: Optional[str] = Field(None, description="英文片名")
    year: Optional[int] = Field(None, description="年份")
    director: Optional[str] = Field(None, description="导演")
    genre: Optional[str] = Field(None, description="类型")
    country: Optional[str] = Field(None, description="国家/地区")
    poster_url: Optional[str] = Field(None, description="海报URL")
    tmdb_url: Optional[str] = Field(None, description="TMDB链接")
    douban_url: Optional[str] = Field(None, description="豆瓣链接")
    status: Optional[str] = Field(None, description="观影状态")
    rating: Optional[int] = Field(None, ge=1, le=5, description="评分 1-5")
    duration_minutes: Optional[int] = Field(None, description="时长（分钟）")
    watch_date: Optional[str] = Field(None, description="观看日期")
    my_review: Optional[str] = Field(None, description="我的评价")
    tags: Optional[str] = Field(None, description="标签")


# ── 端点 ──────────────────────────────────────────────────────────

@router.get("/movies", summary="获取影视列表")
async def list_movies(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="按状态筛选"),
    genre: Optional[str] = Query(None, description="按类型筛选"),
    search: Optional[str] = Query(None, description="按片名/导演搜索"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询用户的影视列表"""
    result = await media_service.list_movies(
        db=db, user_id=current_user.id, page=page, size=size,
        status=status, genre=genre, search=search,
    )
    return {"message": "查询成功", "data": result}


@router.post("/movies", summary="添加影视", status_code=201)
async def create_movie(
    current_user: User = Depends(get_current_user),
    data: MovieCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """创建新的影视记录"""
    movie = await media_service.create_movie(
        db=db, user_id=current_user.id, data=data.model_dump(exclude_none=True),
    )
    return {"message": "添加成功", "data": movie}


@router.get("/movies/{movie_id}", summary="获取影视详情")
async def get_movie(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单部影视的详细信息"""
    from sqlalchemy import select
    from app.models.media import Movie
    result = await db.execute(
        select(Movie).where(
            Movie.id == movie_id,
            Movie.user_id == current_user.id,
        )
    )
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="影视记录不存在")
    return {"message": "查询成功", "data": movie}


@router.patch("/movies/{movie_id}", summary="更新影视")
async def update_movie(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    data: MovieUpdate = ...,
    db: AsyncSession = Depends(get_db),
):
    """更新影视信息，仅允许更新自己的影视记录"""
    movie = await media_service.update_movie(
        db=db, movie_id=movie_id, user_id=current_user.id,
        data=data.model_dump(exclude_none=True),
    )
    if not movie:
        raise HTTPException(status_code=404, detail="影视记录不存在或无权操作")
    return {"message": "更新成功", "data": movie}


@router.delete("/movies/{movie_id}", summary="删除影视")
async def delete_movie(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除影视记录，仅允许删除自己的影视记录"""
    deleted = await media_service.delete_movie(
        db=db, movie_id=movie_id, user_id=current_user.id,
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="影视记录不存在或无权操作")
    return {"message": "删除成功"}
