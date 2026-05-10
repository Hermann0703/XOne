"""知识库 + RAG 问答 API — 文档管理 / 搜索 / 对话 / 统计"""

from __future__ import annotations

import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import knowledge_service
from app.services import rag_service

router = APIRouter(prefix="/knowledge", tags=["工作-知识库"])


# ── Pydantic Schemas ──────────────────────────────────────────────────


class BatchDeleteRequest(BaseModel):
    """批量删除请求体"""
    ids: list[str] = Field(..., min_length=1, description="文档ID列表")


class ChatRequest(BaseModel):
    """RAG 问答请求体"""
    question: str = Field(..., min_length=1, description="用户问题")
    history: Optional[list[dict]] = Field(default=None, description="对话历史")


class ConversationCreate(BaseModel):
    """创建对话请求体"""
    title: str = Field(..., min_length=1, max_length=512, description="对话标题")
    messages: list[dict] = Field(default_factory=list, description="对话消息列表")


class ConversationUpdate(BaseModel):
    """更新对话请求体"""
    title: Optional[str] = Field(default=None, min_length=1, max_length=512, description="对话标题")
    messages: Optional[list[dict]] = Field(default=None, description="对话消息列表")


# ── 辅助序列化函数 ────────────────────────────────────────────────────


def _doc_to_dict(doc) -> dict:
    """文档序列化为字典"""
    return {
        "id": str(doc.id),
        "title": doc.title,
        "file_type": doc.file_type,
        "file_path": doc.file_path,
        "source_url": doc.source_url,
        "status": doc.status,
        "chunk_count": doc.chunk_count,
        "user_id": doc.user_id,
        "tags": doc.tags,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
    }


def _conv_to_dict(conv) -> dict:
    """对话序列化为字典"""
    return {
        "id": str(conv.id),
        "title": conv.title,
        "messages": conv.messages,
        "user_id": conv.user_id,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
    }


# ═══════════════════════════════════════════════════════════════════════
#  文档管理端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/documents", summary="获取文档列表")
async def get_documents(
    current_user: User = Depends(get_current_user),
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(default=None, description="搜索关键词"),
    status: Optional[str] = Query(default=None, description="状态筛选: processing/ready/error"),
    tags: Optional[str] = Query(default=None, description="标签筛选"),
    db: AsyncSession = Depends(get_db),
):
    """获取知识库文档列表，支持分页、搜索、状态过滤、标签过滤"""
    if search:
        result = await knowledge_service.search_documents(db, search, page, page_size)
    else:
        result = await knowledge_service.list_documents(db, page, page_size, status, tags)

    return {
        "code": 0,
        "message": "查询成功",
        "data": {
            "items": [_doc_to_dict(d) for d in result["items"]],
            "total": result["total"],
            "page": page,
            "page_size": page_size,
        },
    }


@router.post("/documents", summary="上传文档")
async def upload_document(
    current_user: User = Depends(get_current_user),
    file: UploadFile = File(..., description="上传文件"),
    title: str = Form(..., description="文档标题"),
    tags: Optional[str] = Form(default=None, description="标签（JSON数组字符串，如 [\"合同\",\"技术\"]）"),
    source_url: Optional[str] = Form(default=None, description="原始URL（网页导入时）"),
    db: AsyncSession = Depends(get_db),
):
    """上传文档：保存文件、解析文本、创建记录并异步索引"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")

    # 读取文件内容
    file_content = await file.read()
    if not file_content:
        raise HTTPException(status_code=400, detail="文件内容为空")

    # 检查文件大小（限制 50MB）
    if len(file_content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件大小不能超过 50MB")

    # 上传文档
    doc = await knowledge_service.upload_document(
        db=db,
        file_content=file_content,
        filename=file.filename,
        title=title,
        user_id=current_user.id,
        content_type=file.content_type,
        tags=tags,
        source_url=source_url,
    )

    # 异步索引（这里同步执行；生产环境应使用 Celery 异步任务）
    doc = await knowledge_service.index_document(db, doc.id)

    return {
        "code": 0,
        "message": "文档上传成功" if doc.status == "ready" else f"文档已上传，索引状态: {doc.status}",
        "data": _doc_to_dict(doc),
    }


@router.get("/documents/{doc_id}", summary="获取文档详情")
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    include_chunks: bool = Query(default=False, description="是否包含分块列表"),
    db: AsyncSession = Depends(get_db),
):
    """获取单个文档详情，可选包含分块列表"""
    try:
        uid = uuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的文档ID格式")

    doc = await knowledge_service.get_document(db, uid)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    data = _doc_to_dict(doc)
    if include_chunks:
        data["chunks"] = await knowledge_service.get_document_chunks(uid)

    return {
        "code": 0,
        "message": "查询成功",
        "data": data,
    }


@router.delete("/documents/{doc_id}", summary="删除文档")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除文档及其关联的向量索引、全文索引和本地文件"""
    try:
        uid = uuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的文档ID格式")

    success = await knowledge_service.delete_document(db, uid)
    if not success:
        raise HTTPException(status_code=404, detail="文档不存在")

    return {
        "code": 0,
        "message": "文档删除成功",
        "data": None,
    }


@router.post("/documents/batch-delete", summary="批量删除文档")
async def batch_delete_documents(
    body: BatchDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量删除文档"""
    try:
        doc_ids = [uuid.UUID(id_str) for id_str in body.ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="存在无效的文档ID格式")

    count = await knowledge_service.batch_delete_documents(db, doc_ids)
    return {
        "code": 0,
        "message": f"批量删除完成，成功删除 {count}/{len(body.ids)} 篇文档",
        "data": {"deleted_count": count, "total": len(body.ids)},
    }


@router.post("/documents/{doc_id}/reindex", summary="重新索引文档")
async def reindex_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """重新索引文档：清除旧索引后重新分块和向量化"""
    try:
        uid = uuid.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的文档ID格式")

    doc = await knowledge_service.reindex_document(db, uid)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    return {
        "code": 0,
        "message": "重新索引完成" if doc.status == "ready" else f"索引状态: {doc.status}",
        "data": _doc_to_dict(doc),
    }


# ═══════════════════════════════════════════════════════════════════════
#  RAG 问答端点
# ═══════════════════════════════════════════════════════════════════════


@router.post("/chat", summary="RAG 知识库问答")
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    RAG 检索增强问答：
    1. 向量化问题
    2. 在知识库中检索 top_k 个相关分块
    3. 拼接上下文构造 prompt
    4. 返回答案和引用文档列表
    """
    result = await rag_service.ask_question(
        question=body.question,
        history=body.history,
        top_k=5,
    )

    return {
        "code": 0,
        "message": "查询完成",
        "data": result,
    }


@router.post("/chat/stream", summary="RAG 知识库流式问答")
async def chat_stream(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    SSE 流式 RAG 问答：
    - 逐 token 推送答案 (type=answer)
    - 末尾发送来源列表 (type=done)
    - 异常时发送错误 (type=error)
    """

    async def generate():
        async for chunk in rag_service.ask_stream(
            question=body.question,
            history=body.history,
            top_k=5,
        ):
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ═══════════════════════════════════════════════════════════════════════
#  对话管理端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/conversations", summary="获取对话历史列表")
async def get_conversations(
    current_user: User = Depends(get_current_user),
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取知识库对话历史列表"""
    result = await knowledge_service.list_conversations(db, user_id=current_user.id, page=page, page_size=page_size)

    return {
        "code": 0,
        "message": "查询成功",
        "data": {
            "items": [_conv_to_dict(c) for c in result["items"]],
            "total": result["total"],
            "page": page,
            "page_size": page_size,
        },
    }


@router.post("/conversations", summary="创建/保存对话")
async def create_conversation(
    body: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的知识库对话记录"""
    conv = await knowledge_service.create_conversation(
        db=db,
        title=body.title,
        messages=body.messages,
        user_id=current_user.id,
    )

    return {
        "code": 0,
        "message": "对话创建成功",
        "data": _conv_to_dict(conv),
    }


@router.get("/conversations/{conv_id}", summary="获取对话详情")
async def get_conversation(
    conv_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个对话详情"""
    try:
        uid = uuid.UUID(conv_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的对话ID格式")

    conv = await knowledge_service.get_conversation(db, uid)
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")

    return {
        "code": 0,
        "message": "查询成功",
        "data": _conv_to_dict(conv),
    }


@router.patch("/conversations/{conv_id}", summary="更新对话")
async def update_conversation(
    conv_id: str,
    body: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新对话标题或消息"""
    try:
        uid = uuid.UUID(conv_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的对话ID格式")

    conv = await knowledge_service.update_conversation(
        db=db,
        conv_id=uid,
        title=body.title,
        messages=body.messages,
    )
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")

    return {
        "code": 0,
        "message": "对话更新成功",
        "data": _conv_to_dict(conv),
    }


# ═══════════════════════════════════════════════════════════════════════
#  统计端点
# ═══════════════════════════════════════════════════════════════════════


@router.get("/stats", summary="知识库统计")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取知识库统计信息：文档总数、总chunk数、最后更新时间"""
    stats = await knowledge_service.get_stats(db, user_id=current_user.id)

    return {
        "code": 0,
        "message": "查询成功",
        "data": stats,
    }
