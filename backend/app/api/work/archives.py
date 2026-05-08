"""档案管理模块API路由 — 档案/借阅/鉴定/文件/仪表盘端点"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import archive_service

router = APIRouter(prefix="/archives", tags=["工作-档案"])


# ── Pydantic schemas ──────────────────────────────────────────────

class ArchiveCreate(BaseModel):
    """创建档案请求体"""
    archive_no: str = Field(..., description="档案编号")
    title: str = Field(..., description="档案标题")
    fonds_id: Optional[int] = Field(None, description="全宗ID")
    category_id: Optional[int] = Field(None, description="分类ID")
    classification_id: Optional[int] = Field(None, description="归档分类ID")
    box_id: Optional[int] = Field(None, description="档案盒ID")
    file_no: Optional[str] = Field(None, description="文件编号")
    volume_no: Optional[str] = Field(None, description="卷号")
    responsible_person: Optional[str] = Field(None, description="责任人")
    doc_date: Optional[str] = Field(None, description="文件日期 (YYYY-MM-DD)")
    page_count: Optional[int] = Field(None, description="页数")
    retention_period: Optional[str] = Field(None, description="保管期限")
    security_level: str = Field("公开", description="密级: 公开/内部/秘密/机密")
    status: int = Field(0, description="状态: 0草稿 1已归档 2已借出 3已销毁")
    description: Optional[str] = Field(None, description="描述")
    keywords: Optional[str] = Field(None, description="关键词")
    location: Optional[str] = Field(None, description="存放位置")


class ArchiveUpdate(BaseModel):
    """更新档案请求体（全部字段可选）"""
    archive_no: Optional[str] = Field(None, description="档案编号")
    title: Optional[str] = Field(None, description="档案标题")
    fonds_id: Optional[int] = Field(None, description="全宗ID")
    category_id: Optional[int] = Field(None, description="分类ID")
    classification_id: Optional[int] = Field(None, description="归档分类ID")
    box_id: Optional[int] = Field(None, description="档案盒ID")
    file_no: Optional[str] = Field(None, description="文件编号")
    volume_no: Optional[str] = Field(None, description="卷号")
    responsible_person: Optional[str] = Field(None, description="责任人")
    doc_date: Optional[str] = Field(None, description="文件日期")
    page_count: Optional[int] = Field(None, description="页数")
    retention_period: Optional[str] = Field(None, description="保管期限")
    security_level: Optional[str] = Field(None, description="密级")
    status: Optional[int] = Field(None, description="状态")
    description: Optional[str] = Field(None, description="描述")
    keywords: Optional[str] = Field(None, description="关键词")
    location: Optional[str] = Field(None, description="存放位置")


class BorrowCreate(BaseModel):
    """创建借阅记录请求体"""
    archive_id: int = Field(..., description="档案ID")
    borrower: str = Field(..., description="借阅人")
    borrow_date: str = Field(..., description="借阅日期 (YYYY-MM-DD)")
    expected_return_date: str = Field(..., description="预计归还日期 (YYYY-MM-DD)")
    purpose: Optional[str] = Field(None, description="借阅目的")
    approver: Optional[str] = Field(None, description="审批人")
    notes: Optional[str] = Field(None, description="备注")


class BorrowUpdate(BaseModel):
    """更新借阅记录请求体"""
    borrower: Optional[str] = Field(None, description="借阅人")
    borrow_date: Optional[str] = Field(None, description="借阅日期")
    expected_return_date: Optional[str] = Field(None, description="预计归还日期")
    status: Optional[str] = Field(None, description="状态: borrowing/returned/overdue")
    purpose: Optional[str] = Field(None, description="借阅目的")
    approver: Optional[str] = Field(None, description="审批人")
    notes: Optional[str] = Field(None, description="备注")


class AppraisalCreate(BaseModel):
    """创建鉴定记录请求体"""
    archive_id: int = Field(..., description="档案ID")
    appraisal_type: str = Field(..., description="鉴定类型: 到期鉴定/销毁鉴定/价值鉴定")
    appraisal_date: str = Field(..., description="鉴定日期 (YYYY-MM-DD)")
    result: str = Field(..., description="鉴定结果")
    appraiser: str = Field(..., description="鉴定人")
    suggestion: Optional[str] = Field(None, description="鉴定建议")
    notes: Optional[str] = Field(None, description="备注")


class AppraisalUpdate(BaseModel):
    """更新鉴定记录请求体"""
    appraisal_type: Optional[str] = Field(None, description="鉴定类型")
    appraisal_date: Optional[str] = Field(None, description="鉴定日期")
    result: Optional[str] = Field(None, description="鉴定结果")
    appraiser: Optional[str] = Field(None, description="鉴定人")
    suggestion: Optional[str] = Field(None, description="鉴定建议")
    notes: Optional[str] = Field(None, description="备注")


class ArchiveFileCreate(BaseModel):
    """创建档案文件请求体"""
    archive_id: int = Field(..., description="档案ID")
    file_name: str = Field(..., description="文件名")
    file_path: str = Field(..., description="文件路径")
    file_size: Optional[int] = Field(None, description="文件大小(字节)")
    file_type: Optional[str] = Field(None, description="文件类型")
    upload_date: str = Field(..., description="上传日期 (YYYY-MM-DD)")


# ── 档案端点 ──────────────────────────────────────────────────────

@router.get("", summary="获取档案列表")
async def list_archives(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="按标题/编号/关键词搜索"),
    status: Optional[int] = Query(None, description="按状态筛选: 0草稿 1已归档 2已借出 3已销毁"),
    fonds_id: Optional[int] = Query(None, description="按全宗ID筛选"),
    category_id: Optional[int] = Query(None, description="按分类ID筛选"),
    security_level: Optional[str] = Query(None, description="按密级筛选"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询档案列表"""
    result = await archive_service.list_archives(
        db=db, user_id=current_user.id, page=page, size=size,
        search=search, status=status, fonds_id=fonds_id,
        category_id=category_id, security_level=security_level,
    )
    return {"message": "查询成功", "data": result}


@router.post("", summary="创建档案", status_code=201)
async def create_archive(
    current_user: User = Depends(get_current_user),
    data: ArchiveCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """创建新的档案记录"""
    archive = await archive_service.create_archive(
        db=db, user_id=current_user.id, data=data.model_dump(exclude_none=True),
    )
    return {"message": "创建成功", "data": archive}


@router.get("/{archive_id}", summary="获取档案详情")
async def get_archive(
    archive_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个档案的详细信息"""
    archive = await archive_service.get_archive(
        db=db, archive_id=archive_id, user_id=current_user.id,
    )
    if not archive:
        raise HTTPException(status_code=404, detail="档案不存在")
    return {"message": "查询成功", "data": archive}


@router.patch("/{archive_id}", summary="更新档案")
async def update_archive(
    archive_id: int,
    current_user: User = Depends(get_current_user),
    data: ArchiveUpdate = ...,
    db: AsyncSession = Depends(get_db),
):
    """更新档案信息"""
    archive = await archive_service.update_archive(
        db=db, archive_id=archive_id, user_id=current_user.id,
        data=data.model_dump(exclude_none=True),
    )
    if not archive:
        raise HTTPException(status_code=404, detail="档案不存在或无权操作")
    return {"message": "更新成功", "data": archive}


@router.delete("/{archive_id}", summary="删除档案")
async def delete_archive(
    archive_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除档案（级联删除关联的借阅记录、鉴定记录、档案文件）"""
    deleted = await archive_service.delete_archive(
        db=db, archive_id=archive_id, user_id=current_user.id,
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="档案不存在或无权操作")
    return {"message": "删除成功"}


# ── 档案文件端点 ──────────────────────────────────────────────────

@router.get("/{archive_id}/files", summary="获取档案文件列表")
async def list_archive_files(
    archive_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取某个档案下的所有文件"""
    # 先确认档案存在
    archive = await archive_service.get_archive(
        db=db, archive_id=archive_id, user_id=current_user.id,
    )
    if not archive:
        raise HTTPException(status_code=404, detail="档案不存在")
    files = await archive_service.list_archive_files(
        db=db, user_id=current_user.id, archive_id=archive_id,
    )
    return {"message": "查询成功", "data": {"items": files, "total": len(files)}}


@router.post("/{archive_id}/files", summary="添加档案文件", status_code=201)
async def create_archive_file(
    archive_id: int,
    current_user: User = Depends(get_current_user),
    data: ArchiveFileCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """为档案添加文件"""
    payload = data.model_dump(exclude_none=True)
    payload["archive_id"] = archive_id
    archive_file = await archive_service.create_archive_file(
        db=db, user_id=current_user.id, data=payload,
    )
    if not archive_file:
        raise HTTPException(status_code=404, detail="档案不存在")
    return {"message": "添加成功", "data": archive_file}


@router.delete("/files/{file_id}", summary="删除档案文件")
async def delete_archive_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除档案文件"""
    deleted = await archive_service.delete_archive_file(
        db=db, file_id=file_id, user_id=current_user.id,
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="文件不存在或无权操作")
    return {"message": "删除成功"}


# ── 借阅记录端点 ──────────────────────────────────────────────────

@router.get("/borrows", summary="获取借阅记录列表")
async def list_borrows(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    archive_id: Optional[int] = Query(None, description="按档案ID筛选"),
    status: Optional[str] = Query(None, description="按状态筛选: borrowing/returned/overdue"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询借阅记录"""
    result = await archive_service.list_borrows(
        db=db, user_id=current_user.id, page=page, size=size,
        archive_id=archive_id, status=status,
    )
    return {"message": "查询成功", "data": result}


@router.post("/borrows", summary="创建借阅记录", status_code=201)
async def create_borrow(
    current_user: User = Depends(get_current_user),
    data: BorrowCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """借阅档案，自动更新档案状态为已借出"""
    borrow = await archive_service.create_borrow(
        db=db, user_id=current_user.id, data=data.model_dump(exclude_none=True),
    )
    if borrow is None:
        raise HTTPException(status_code=400, detail="借阅失败：档案不存在、无权操作或已被借出")
    return {"message": "借阅成功", "data": borrow}


@router.get("/borrows/{borrow_id}", summary="获取借阅记录详情")
async def get_borrow(
    borrow_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单条借阅记录详情"""
    from sqlalchemy import select
    from app.models.archive import BorrowRecord, Archive
    result = await db.execute(
        select(BorrowRecord)
        .join(Archive, BorrowRecord.archive_id == Archive.id)
        .where(BorrowRecord.id == borrow_id, Archive.user_id == current_user.id)
    )
    borrow = result.scalar_one_or_none()
    if not borrow:
        raise HTTPException(status_code=404, detail="借阅记录不存在")
    return {"message": "查询成功", "data": borrow}


@router.patch("/borrows/{borrow_id}", summary="更新借阅记录")
async def update_borrow(
    borrow_id: int,
    current_user: User = Depends(get_current_user),
    data: BorrowUpdate = ...,
    db: AsyncSession = Depends(get_db),
):
    """更新借阅记录"""
    borrow = await archive_service.update_borrow(
        db=db, borrow_id=borrow_id, user_id=current_user.id,
        data=data.model_dump(exclude_none=True),
    )
    if not borrow:
        raise HTTPException(status_code=404, detail="借阅记录不存在或无权操作")
    return {"message": "更新成功", "data": borrow}


@router.post("/borrows/{borrow_id}/return", summary="归还档案")
async def return_borrow(
    borrow_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """归还档案：更新借阅状态为已归还，恢复档案状态为已归档"""
    result = await archive_service.return_borrow(
        db=db, borrow_id=borrow_id, user_id=current_user.id,
    )
    if result is None:
        raise HTTPException(status_code=400, detail="归还失败：借阅记录不存在、无权操作或已归还")
    return {"message": "归还成功", "data": result}


# ── 鉴定记录端点 ──────────────────────────────────────────────────

@router.get("/appraisals", summary="获取鉴定记录列表")
async def list_appraisals(
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    archive_id: Optional[int] = Query(None, description="按档案ID筛选"),
    db: AsyncSession = Depends(get_db),
):
    """分页查询鉴定记录"""
    result = await archive_service.list_appraisals(
        db=db, user_id=current_user.id, page=page, size=size, archive_id=archive_id,
    )
    return {"message": "查询成功", "data": result}


@router.post("/appraisals", summary="创建鉴定记录", status_code=201)
async def create_appraisal(
    current_user: User = Depends(get_current_user),
    data: AppraisalCreate = ...,
    db: AsyncSession = Depends(get_db),
):
    """创建鉴定记录"""
    appraisal = await archive_service.create_appraisal(
        db=db, user_id=current_user.id, data=data.model_dump(exclude_none=True),
    )
    if not appraisal:
        raise HTTPException(status_code=404, detail="档案不存在")
    return {"message": "创建成功", "data": appraisal}


@router.get("/appraisals/{appraisal_id}", summary="获取鉴定记录详情")
async def get_appraisal(
    appraisal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单条鉴定记录详情"""
    from sqlalchemy import select
    from app.models.archive import AppraisalRecord, Archive
    result = await db.execute(
        select(AppraisalRecord)
        .join(Archive, AppraisalRecord.archive_id == Archive.id)
        .where(AppraisalRecord.id == appraisal_id, Archive.user_id == current_user.id)
    )
    appraisal = result.scalar_one_or_none()
    if not appraisal:
        raise HTTPException(status_code=404, detail="鉴定记录不存在")
    return {"message": "查询成功", "data": appraisal}


@router.patch("/appraisals/{appraisal_id}", summary="更新鉴定记录")
async def update_appraisal(
    appraisal_id: int,
    current_user: User = Depends(get_current_user),
    data: AppraisalUpdate = ...,
    db: AsyncSession = Depends(get_db),
):
    """更新鉴定记录"""
    appraisal = await archive_service.update_appraisal(
        db=db, appraisal_id=appraisal_id, user_id=current_user.id,
        data=data.model_dump(exclude_none=True),
    )
    if not appraisal:
        raise HTTPException(status_code=404, detail="鉴定记录不存在或无权操作")
    return {"message": "更新成功", "data": appraisal}


@router.delete("/appraisals/{appraisal_id}", summary="删除鉴定记录")
async def delete_appraisal(
    appraisal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除鉴定记录"""
    deleted = await archive_service.delete_appraisal(
        db=db, appraisal_id=appraisal_id, user_id=current_user.id,
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="鉴定记录不存在或无权操作")
    return {"message": "删除成功"}


# ── 仪表盘端点 ────────────────────────────────────────────────────

@router.get("/dashboard", summary="档案仪表盘")
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取档案仪表盘数据：总数、状态/密级分布、本月借阅、逾期未还、最近操作"""
    dashboard = await archive_service.get_dashboard(db=db, user_id=current_user.id)
    return {"message": "查询成功", "data": dashboard}
