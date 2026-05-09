"""物理存储管理模块API路由 — 档案柜/档案盒端点"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import storage_service

router = APIRouter(prefix="/storage", tags=["工作-存储"])


# ── Pydantic schemas ──────────────────────────────────────────────

class CabinetCreate(BaseModel):
    """创建档案柜请求体"""
    name: str = Field(..., description="档案柜名称")
    code: str = Field(..., description="档案柜编号")
    location: str = Field(..., description="存放位置")
    floor: Optional[int] = Field(None, description="楼层")
    room: Optional[str] = Field(None, description="房间号")
    description: Optional[str] = Field(None, description="描述")


class CabinetUpdate(BaseModel):
    """更新档案柜请求体"""
    name: Optional[str] = Field(None, description="档案柜名称")
    code: Optional[str] = Field(None, description="档案柜编号")
    location: Optional[str] = Field(None, description="存放位置")
    floor: Optional[int] = Field(None, description="楼层")
    room: Optional[str] = Field(None, description="房间号")
    description: Optional[str] = Field(None, description="描述")


class BoxCreate(BaseModel):
    """创建档案盒请求体"""
    cabinet_id: int = Field(..., description="所属档案柜ID")
    box_no: str = Field(..., description="盒号")
    row: Optional[int] = Field(None, description="行")
    col: Optional[int] = Field(None, description="列")
    layer: Optional[int] = Field(None, description="层")
    barcode: Optional[str] = Field(None, description="条形码")
    status: str = Field("empty", description="状态: empty/partial/full")
    description: Optional[str] = Field(None, description="描述")


class BoxUpdate(BaseModel):
    """更新档案盒请求体"""
    cabinet_id: Optional[int] = Field(None, description="所属档案柜ID")
    box_no: Optional[str] = Field(None, description="盒号")
    row: Optional[int] = Field(None, description="行")
    col: Optional[int] = Field(None, description="列")
    layer: Optional[int] = Field(None, description="层")
    barcode: Optional[str] = Field(None, description="条形码")
    status: Optional[str] = Field(None, description="状态: empty/partial/full")
    description: Optional[str] = Field(None, description="描述")


# ── 档案柜端点 ────────────────────────────────────────────────────

@router.get("/cabinets", summary="获取档案柜列表")
async def list_cabinets(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="按名称搜索"),
    location: Optional[str] = Query(None, description="按位置搜索"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询档案柜列表"""
    result = await storage_service.list_cabinets(
        db=db, page=page, size=size, search=search, location=location,
    )
    return {"message": "查询成功", "data": result}


@router.post("/cabinets", summary="创建档案柜", status_code=201)
async def create_cabinet(
    current_user: User = Depends(get_current_user),
    data: CabinetCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """创建新的档案柜"""
    cabinet = await storage_service.create_cabinet(
        db=db, data=data.model_dump(exclude_none=True),
    )
    return {"message": "创建成功", "data": cabinet}


@router.get("/cabinets/{cabinet_id}", summary="获取档案柜详情")
async def get_cabinet(
    cabinet_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个档案柜的详细信息"""
    cabinet = await storage_service.get_cabinet(db=db, cabinet_id=cabinet_id)
    if not cabinet:
        raise HTTPException(status_code=404, detail="档案柜不存在")
    return {"message": "查询成功", "data": cabinet}


@router.patch("/cabinets/{cabinet_id}", summary="更新档案柜")
async def update_cabinet(
    cabinet_id: int,
    current_user: User = Depends(get_current_user),
    data: CabinetUpdate = ...,
    db: AsyncSession = Depends(get_db),
):
    """更新档案柜信息"""
    cabinet = await storage_service.update_cabinet(
        db=db, cabinet_id=cabinet_id, data=data.model_dump(exclude_none=True),
    )
    if not cabinet:
        raise HTTPException(status_code=404, detail="档案柜不存在")
    return {"message": "更新成功", "data": cabinet}


@router.delete("/cabinets/{cabinet_id}", summary="删除档案柜")
async def delete_cabinet(
    cabinet_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除档案柜（级联删除所有档案盒）"""
    deleted = await storage_service.delete_cabinet(db=db, cabinet_id=cabinet_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="档案柜不存在")
    return {"message": "删除成功"}


@router.get("/cabinets/{cabinet_id}/boxes", summary="获取档案柜内所有档案盒")
async def get_cabinet_boxes(
    cabinet_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取某个档案柜内的所有档案盒"""
    cabinet = await storage_service.get_cabinet(db=db, cabinet_id=cabinet_id)
    if not cabinet:
        raise HTTPException(status_code=404, detail="档案柜不存在")
    boxes = await storage_service.get_cabinet_boxes(db=db, cabinet_id=cabinet_id)
    return {"message": "查询成功", "data": {"items": boxes, "total": len(boxes)}}


# ── 档案盒端点 ────────────────────────────────────────────────────

@router.get("/boxes", summary="获取档案盒列表")
async def list_boxes(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    cabinet_id: Optional[int] = Query(None, description="按档案柜ID筛选"),
    status: Optional[str] = Query(None, description="按状态筛选: empty/partial/full"),
    search: Optional[str] = Query(None, description="按盒号搜索"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询档案盒列表"""
    result = await storage_service.list_boxes(
        db=db, page=page, size=size, cabinet_id=cabinet_id,
        status=status, search=search,
    )
    return {"message": "查询成功", "data": result}


@router.post("/boxes", summary="创建档案盒", status_code=201)
async def create_box(
    current_user: User = Depends(get_current_user),
    data: BoxCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """创建新的档案盒"""
    box = await storage_service.create_box(
        db=db, data=data.model_dump(exclude_none=True),
    )
    if not box:
        raise HTTPException(status_code=404, detail="所属档案柜不存在")
    return {"message": "创建成功", "data": box}


@router.get("/boxes/{box_id}", summary="获取档案盒详情")
async def get_box(
    box_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个档案盒的详细信息"""
    box = await storage_service.get_box(db=db, box_id=box_id)
    if not box:
        raise HTTPException(status_code=404, detail="档案盒不存在")
    return {"message": "查询成功", "data": box}


@router.patch("/boxes/{box_id}", summary="更新档案盒")
async def update_box(
    box_id: int,
    current_user: User = Depends(get_current_user),
    data: BoxUpdate = ...,
    db: AsyncSession = Depends(get_db),
):
    """更新档案盒信息"""
    box = await storage_service.update_box(
        db=db, box_id=box_id, data=data.model_dump(exclude_none=True),
    )
    if not box:
        raise HTTPException(status_code=404, detail="档案盒不存在")
    return {"message": "更新成功", "data": box}


@router.delete("/boxes/{box_id}", summary="删除档案盒")
async def delete_box(
    box_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除档案盒"""
    deleted = await storage_service.delete_box(db=db, box_id=box_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="档案盒不存在")
    return {"message": "删除成功"}


@router.get("/boxes/{box_id}/archives", summary="获取档案盒内所有档案")
async def get_box_archives(
    box_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取某个档案盒内的所有档案"""
    box = await storage_service.get_box(db=db, box_id=box_id)
    if not box:
        raise HTTPException(status_code=404, detail="档案盒不存在")
    archives = await storage_service.get_box_archives(db=db, box_id=box_id)
    return {"message": "查询成功", "data": {"items": archives, "total": len(archives)}}
