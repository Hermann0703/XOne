"""全局搜索 API — 跨模块搜索与索引重建

端点:
  POST /work/search/global  — 全局搜索
  POST /work/search/reindex — 管理员重建索引
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.search_service import (
    get_search_client,
    MeilisearchClient,
    INDEX_CONTRACTS,
    INDEX_ARCHIVES,
    INDEX_KNOWLEDGE,
    INDEX_DISPATCH,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["全局搜索"])


# ── Pydantic Schemas ──────────────────────────────────────────────

class GlobalSearchRequest(BaseModel):
    """全局搜索请求体"""
    query: str = Field(..., min_length=1, description="搜索关键词")
    limit: int = Field(default=20, ge=1, le=100, description="返回结果数量上限")


class GlobalSearchResponse(BaseModel):
    """全局搜索响应体"""
    results: list[dict] = Field(default_factory=list, description="搜索结果列表")
    total: int = Field(default=0, description="结果总数")


class ReindexResponse(BaseModel):
    """重建索引响应体"""
    message: str = Field(..., description="操作结果消息")
    stats: dict = Field(default_factory=dict, description="各索引文档数量统计")


# ── API 端点 ──────────────────────────────────────────────────────

@router.post("/global", summary="全局搜索")
async def global_search(req: GlobalSearchRequest, current_user: User = Depends(get_current_user)):
    """跨 contracts / archives / knowledge / dispatch 四个索引进行全文搜索。

    搜索字段: title / content / summary
    返回合并排序后的结果列表。
    """
    client = get_search_client()
    try:
        result = client.search_global(query=req.query, limit=req.limit)
        return {
            "code": 0,
            "message": "搜索完成",
            "data": {
                "results": result["results"],
                "total": result["total"],
            },
        }
    except Exception as e:
        logger.exception("全局搜索失败: query=%s", req.query)
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")


@router.post("/reindex", summary="重建全部索引")
async def rebuild_indices(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """管理员功能: 从 PostgreSQL 读取全量数据重建 Meilisearch 索引。

    会清空现有索引后重新导入:
    - contracts   ← contracts 表
    - archives    ← archives 表
    - knowledge   ← knowledge_documents 表
    - dispatch    ← dispatch_data_sources + dispatch_tasks 表
    """
    client = get_search_client()
    stats: dict[str, int] = {}

    try:
        # ── 1. contracts ──────────────────────────────────────────
        await _reindex_contracts(client, db, stats)

        # ── 2. archives ───────────────────────────────────────────
        await _reindex_archives(client, db, stats)

        # ── 3. knowledge ──────────────────────────────────────────
        await _reindex_knowledge(client, db, stats)

        # ── 4. dispatch ───────────────────────────────────────────
        await _reindex_dispatch(client, db, stats)

        logger.info("全量索引重建完成: %s", stats)
        return {
            "code": 0,
            "message": "全量索引重建完成",
            "data": {
                "message": "全量索引重建完成",
                "stats": stats,
            },
        }

    except Exception as e:
        logger.exception("全量索引重建失败")
        raise HTTPException(status_code=500, detail=f"索引重建失败: {str(e)}")


# ── 各模块索引重建辅助函数 ────────────────────────────────────────

async def _reindex_contracts(client: MeilisearchClient, db: AsyncSession, stats: dict) -> None:
    """重建 contracts 索引"""
    from app.models.contract import Contract

    client.delete_all_documents(INDEX_CONTRACTS)

    stmt = select(Contract).options(selectinload(Contract.supplier_rel)).limit(10000)
    result = await db.execute(stmt)
    contracts = result.scalars().all()

    count = 0
    for c in contracts:
        doc = {
            "id": f"contract_{c.id}",
            "title": c.contract_name,
            "content": c.description or "",
            "summary": f"合同 {c.contract_no} - 供应商 {c.supplier_rel.name if c.supplier_rel else '—'} - 金额 {c.amount} {c.currency}",
            "type": "contract",
            "contract_no": c.contract_no,
            "status": c.status,
            "party_a": c.supplier_rel.name if c.supplier_rel else None,
            "party_b": None,
            "amount": c.amount,
            "keywords": c.keywords or "",
        }
        client.index_document(INDEX_CONTRACTS, doc["id"], doc)
        count += 1

    stats[INDEX_CONTRACTS] = count
    logger.info("contracts 索引重建完成: %d 条", count)


async def _reindex_archives(client: MeilisearchClient, db: AsyncSession, stats: dict) -> None:
    """重建 archives 索引"""
    from app.models.archive import Archive

    client.delete_all_documents(INDEX_ARCHIVES)

    stmt = select(Archive).limit(10000)
    result = await db.execute(stmt)
    archives = result.scalars().all()

    count = 0
    for a in archives:
        doc = {
            "id": f"archive_{a.id}",
            "title": a.title,
            "content": a.description or "",
            "summary": f"档案 {a.archive_no} - {a.security_level} - 负责人 {a.responsible_person or '未知'}",
            "type": "archive",
            "archive_no": a.archive_no,
            "status": a.status,
            "security_level": a.security_level,
            "keywords": a.keywords or "",
        }
        client.index_document(INDEX_ARCHIVES, doc["id"], doc)
        count += 1

    stats[INDEX_ARCHIVES] = count
    logger.info("archives 索引重建完成: %d 条", count)


async def _reindex_knowledge(client: MeilisearchClient, db: AsyncSession, stats: dict) -> None:
    """重建 knowledge 索引"""
    from app.models.knowledge import KnowledgeDocument

    client.delete_all_documents(INDEX_KNOWLEDGE)

    stmt = select(KnowledgeDocument).where(
        KnowledgeDocument.status == "ready"
    ).limit(10000)
    result = await db.execute(stmt)
    docs = result.scalars().all()

    count = 0
    for kd in docs:
        # 截取内容前 2000 字符作为 summary
        content = kd.content or ""
        summary = content[:2000] if len(content) > 2000 else content

        doc = {
            "id": f"knowledge_{kd.id}",
            "title": kd.title,
            "content": content,
            "summary": summary,
            "type": "knowledge",
            "file_type": kd.file_type,
            "status": kd.status,
            "tags": kd.tags or "",
        }
        client.index_document(INDEX_KNOWLEDGE, doc["id"], doc)
        count += 1

    stats[INDEX_KNOWLEDGE] = count
    logger.info("knowledge 索引重建完成: %d 条", count)


async def _reindex_dispatch(client: MeilisearchClient, db: AsyncSession, stats: dict) -> None:
    """重建 dispatch 索引（数据源 + 报送任务）"""
    from app.models.dispatch import DispatchDataSource, DispatchTask

    client.delete_all_documents(INDEX_DISPATCH)

    count = 0

    # 索引数据源
    stmt_src = select(DispatchDataSource).limit(10000)
    result_src = await db.execute(stmt_src)
    sources = result_src.scalars().all()

    for ds in sources:
        doc = {
            "id": f"dispatch_source_{ds.id}",
            "title": ds.name,
            "content": f"数据源类型: {ds.source_type}",
            "summary": f"数据源 {ds.name} - 类型 {ds.source_type} - 状态 {ds.status}",
            "type": "dispatch_source",
            "source_type": ds.source_type,
            "status": ds.status,
        }
        client.index_document(INDEX_DISPATCH, doc["id"], doc)
        count += 1

    # 索引报送任务
    stmt_task = select(DispatchTask).limit(10000)
    result_task = await db.execute(stmt_task)
    tasks = result_task.scalars().all()

    for dt in tasks:
        doc = {
            "id": f"dispatch_task_{dt.id}",
            "title": dt.name,
            "content": f"目标表: {dt.target_table}, 计划: {dt.schedule}",
            "summary": f"报送任务 {dt.name} - 目标 {dt.target_table} - 状态 {dt.status}",
            "type": "dispatch_task",
            "target_table": dt.target_table,
            "status": dt.status,
            "schedule": dt.schedule,
        }
        client.index_document(INDEX_DISPATCH, doc["id"], doc)
        count += 1

    stats[INDEX_DISPATCH] = count
    logger.info("dispatch 索引重建完成: %d 条", count)
