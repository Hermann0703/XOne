"""知识库服务层 — 文档上传/索引/搜索/删除 业务逻辑"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.knowledge import KnowledgeDocument, KnowledgeConversation

# ── 向量/搜索客户端（懒加载，连接不可用时 graceful degrade）──

_qdrant_client = None
_meilisearch_client = None
_embedding_model = None
_collection_name = "knowledge_chunks"


def _get_qdrant():
    """获取 Qdrant 客户端，连接失败返回 None"""
    global _qdrant_client
    if _qdrant_client is None:
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http.exceptions import UnexpectedResponse
            _qdrant_client = QdrantClient(url=settings.QDRANT_URL, timeout=10)
            # 健康检查
            _qdrant_client.get_collections()
        except Exception:
            _qdrant_client = False  # type: ignore
    return _qdrant_client if _qdrant_client is not False else None


def _get_meilisearch():
    """获取 Meilisearch 客户端，连接失败返回 None"""
    global _meilisearch_client
    if _meilisearch_client is None:
        try:
            import meilisearch
            _meilisearch_client = meilisearch.Client(
                settings.MEILISEARCH_URL, settings.MEILISEARCH_KEY
            )
            _meilisearch_client.health()
        except Exception:
            _meilisearch_client = False  # type: ignore
    return _meilisearch_client if _meilisearch_client is not False else None


def _get_embedding_model():
    """获取 sentence-transformers embedding 模型，加载失败返回 None"""
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception:
            _embedding_model = False  # type: ignore
    return _embedding_model if _embedding_model is not False else None


def _get_embedding(text: str) -> list[float]:
    """对文本进行向量化，返回 384 维向量列表"""
    model = _get_embedding_model()
    if model is None:
        # 返回零向量作为 placeholder（生产环境应使用 OpenAI 等在线 API）
        return [0.0] * 384
    return model.encode(text).tolist()


def _ensure_qdrant_collection():
    """确保 Qdrant 集合存在"""
    qdrant = _get_qdrant()
    if qdrant is None:
        return False
    try:
        from qdrant_client.http import models as qdrant_models
        collections = qdrant.get_collections()
        names = [c.name for c in collections.collections]
        if _collection_name not in names:
            qdrant.create_collection(
                collection_name=_collection_name,
                vectors_config=qdrant_models.VectorParams(
                    size=384,
                    distance=qdrant_models.Distance.COSINE,
                ),
            )
        return True
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════════
# 文档解析
# ═══════════════════════════════════════════════════════════════════

TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".xml", ".html", ".htm", ".py", ".js", ".ts"}
SUPPORTED_MIME_MAP = {
    "text/plain": "txt",
    "text/markdown": "md",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}


def _infer_file_type(filename: str, content_type: Optional[str] = None) -> str:
    """推断文件类型"""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    elif ext == ".docx":
        return "docx"
    elif ext == ".md":
        return "md"
    elif ext in TEXT_EXTENSIONS:
        return "txt"
    elif content_type:
        return SUPPORTED_MIME_MAP.get(content_type, "txt")
    return "txt"


def _parse_text_content(file_path: str, file_type: str) -> str:
    """从文件解析文本内容"""
    if file_type in ("txt", "md", "网页"):
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()

    # 尝试使用 markitdown 解析 PDF/DOCX
    try:
        from markitdown import MarkItDown
        md = MarkItDown()
        result = md.convert(file_path)
        return result.text_content
    except Exception:
        pass

    # fallback: 对于不可解析的文件，返回占位内容
    return f"[无法解析文件内容: {os.path.basename(file_path)}]"


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """将文本按固定大小分块，带重叠"""
    if not text or not text.strip():
        return []

    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end]
        # 尽量在句末或换行处切分
        if end < text_len:
            # 向后寻找最近的句号或换行
            for sep in ("\n", "。", ".", "！", "？", "?"):
                last_sep = chunk.rfind(sep)
                if last_sep > chunk_size // 2:
                    end = start + last_sep + 1
                    chunk = text[start:end]
                    break
        chunks.append(chunk.strip())
        start = end - overlap
        if start >= text_len:
            break

    return chunks


# ═══════════════════════════════════════════════════════════════════
# 文档 CRUD
# ═══════════════════════════════════════════════════════════════════


async def upload_document(
    db: AsyncSession,
    file_content: bytes,
    filename: str,
    title: str,
    user_id: UUID,
    content_type: Optional[str] = None,
    tags: Optional[str] = None,
    source_url: Optional[str] = None,
) -> KnowledgeDocument:
    """上传文档：保存文件，解析文本，创建数据库记录（状态=processing）"""
    file_type = _infer_file_type(filename, content_type)
    doc_id = uuid.uuid4()

    # 保存文件到 uploads/ 目录
    upload_dir = Path("uploads/knowledge")
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(filename).suffix
    saved_name = f"{doc_id}{ext}"
    file_path = upload_dir / saved_name
    file_path.write_bytes(file_content)

    # 解析文本内容
    try:
        content = _parse_text_content(str(file_path), file_type)
    except Exception:
        content = f"[解析失败: {filename}]"

    # 创建记录
    doc = KnowledgeDocument(
        id=doc_id,
        title=title,
        file_type=file_type,
        file_path=str(file_path),
        content=content,
        source_url=source_url,
        status="processing",
        chunk_count=0,
        user_id=user_id,
        tags=tags,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


async def index_document(db: AsyncSession, doc_id: uuid.UUID) -> Optional[KnowledgeDocument]:
    """索引文档：分块→Qdrant向量化→Meilisearch全文索引→更新状态为ready"""
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        return None

    if not doc.content:
        doc.status = "error"
        await db.flush()
        return doc

    try:
        # 分块
        chunks = _chunk_text(doc.content, chunk_size=500, overlap=50)
        if not chunks:
            doc.status = "error"
            doc.chunk_count = 0
            await db.flush()
            return doc

        # Qdrant 向量化存储
        qdrant = _get_qdrant()
        if qdrant is not None and _ensure_qdrant_collection():
            from qdrant_client.http import models as qdrant_models

            points = []
            for i, chunk_text in enumerate(chunks):
                vector = _get_embedding(chunk_text)
                points.append(
                    qdrant_models.PointStruct(
                        id=uuid.uuid4().hex,
                        vector=vector,
                        payload={
                            "doc_id": str(doc_id),
                            "title": doc.title,
                            "chunk_index": i,
                            "text": chunk_text,
                            "file_type": doc.file_type,
                        },
                    )
                )

            # 批量插入，每批 100 个
            batch_size = 100
            for i in range(0, len(points), batch_size):
                batch = points[i : i + batch_size]
                qdrant.upsert(collection_name=_collection_name, points=batch)

        # Meilisearch 全文索引
        meili = _get_meilisearch()
        if meili is not None:
            try:
                index = meili.index("knowledge_documents")
                # 确保索引存在并可搜索
                try:
                    index.get_settings()
                except Exception:
                    index.add_documents([{"id": "__init__"}])
                    index.delete_document("__init__")

                index.add_documents([
                    {
                        "id": str(doc_id),
                        "title": doc.title,
                        "content": doc.content[:10000],  # 截断避免过大
                        "file_type": doc.file_type,
                        "chunk_count": len(chunks),
                        "tags": doc.tags,
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                ])
            except Exception:
                pass  # Meilisearch 索引失败不影响主流程

        # 更新状态
        doc.status = "ready"
        doc.chunk_count = len(chunks)
        await db.flush()
        await db.refresh(doc)
        return doc

    except Exception as e:
        doc.status = "error"
        await db.flush()
        await db.refresh(doc)
        return doc


async def search_documents(
    db: AsyncSession,
    query: str,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """全文搜索文档（优先使用 Meilisearch，fallback 到 PostgreSQL LIKE）"""
    meili = _get_meilisearch()
    if meili is not None and query.strip():
        try:
            index = meili.index("knowledge_documents")
            result = index.search(query, {"limit": page_size, "offset": (page - 1) * page_size})
            hits = result.get("hits", [])
            estimated_total = result.get("estimatedTotalHits", len(hits))

            # 从 PostgreSQL 获取完整记录
            doc_ids = [hit.get("id") for hit in hits if hit.get("id")]
            items = []
            if doc_ids:
                stmt = select(KnowledgeDocument).where(
                    KnowledgeDocument.id.in_([uuid.UUID(did) for did in doc_ids])
                )
                db_result = await db.execute(stmt)
                doc_map = {str(d.id): d for d in db_result.scalars().all()}
                for hit in hits:
                    doc = doc_map.get(hit.get("id"))
                    if doc:
                        items.append(doc)

            return {"items": items, "total": estimated_total}
        except Exception:
            pass

    # Fallback: PostgreSQL LIKE 搜索
    query_filter = KnowledgeDocument.title.ilike(f"%{query}%") if query else True
    count_stmt = select(func.count(KnowledgeDocument.id)).where(query_filter)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    stmt = (
        select(KnowledgeDocument)
        .where(query_filter)
        .order_by(KnowledgeDocument.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def list_documents(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    tags: Optional[str] = None,
) -> dict:
    """PostgreSQL 分页查询文档列表"""
    conditions = [KnowledgeDocument.user_id == user_id]

    if status:
        conditions.append(KnowledgeDocument.status == status)
    if tags:
        # JSON 字符串包含匹配
        conditions.append(KnowledgeDocument.tags.ilike(f"%{tags}%"))

    base_filter = and_(*conditions)

    count_stmt = select(func.count(KnowledgeDocument.id)).where(base_filter)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    stmt = (
        select(KnowledgeDocument)
        .where(base_filter)
        .order_by(KnowledgeDocument.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def get_document(db: AsyncSession, doc_id: uuid.UUID) -> Optional[KnowledgeDocument]:
    """获取单个文档详情"""
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    return result.scalar_one_or_none()


async def get_document_chunks(doc_id: uuid.UUID) -> list[dict]:
    """获取文档在 Qdrant 中的所有分块列表"""
    qdrant = _get_qdrant()
    if qdrant is None:
        return []

    try:
        from qdrant_client.http import models as qdrant_models

        points, _ = qdrant.scroll(
            collection_name=_collection_name,
            scroll_filter=qdrant_models.Filter(
                must=[
                    qdrant_models.FieldCondition(
                        key="doc_id",
                        match=qdrant_models.MatchValue(value=str(doc_id)),
                    )
                ]
            ),
            limit=1000,
        )
        chunks = []
        for point in points:
            payload = point.payload or {}
            chunks.append({
                "point_id": point.id,
                "chunk_index": payload.get("chunk_index", 0),
                "text": payload.get("text", ""),
            })
        chunks.sort(key=lambda c: c["chunk_index"])
        return chunks
    except Exception:
        return []


async def delete_document(db: AsyncSession, doc_id: uuid.UUID) -> bool:
    """删除文档：PostgreSQL 记录 + Qdrant 向量 + Meilisearch 索引 + 本地文件"""
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        return False

    # 删除 Qdrant 向量
    qdrant = _get_qdrant()
    if qdrant is not None:
        try:
            from qdrant_client.http import models as qdrant_models

            qdrant.delete(
                collection_name=_collection_name,
                points_selector=qdrant_models.FilterSelector(
                    filter=qdrant_models.Filter(
                        must=[
                            qdrant_models.FieldCondition(
                                key="doc_id",
                                match=qdrant_models.MatchValue(value=str(doc_id)),
                            )
                        ]
                    )
                ),
            )
        except Exception:
            pass

    # 删除 Meilisearch 索引
    meili = _get_meilisearch()
    if meili is not None:
        try:
            index = meili.index("knowledge_documents")
            index.delete_document(str(doc_id))
        except Exception:
            pass

    # 删除本地文件
    if doc.file_path:
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    # 删除数据库记录
    await db.delete(doc)
    await db.flush()
    return True


async def batch_delete_documents(db: AsyncSession, doc_ids: list[uuid.UUID]) -> int:
    """批量删除文档，返回成功删除数量"""
    count = 0
    for doc_id in doc_ids:
        success = await delete_document(db, doc_id)
        if success:
            count += 1
    return count


async def reindex_document(db: AsyncSession, doc_id: uuid.UUID) -> Optional[KnowledgeDocument]:
    """重新索引文档：先清除旧索引，再重新分块和向量化"""
    doc = await get_document(db, doc_id)
    if not doc:
        return None

    # 清除旧 Qdrant 向量
    qdrant = _get_qdrant()
    if qdrant is not None:
        try:
            from qdrant_client.http import models as qdrant_models

            qdrant.delete(
                collection_name=_collection_name,
                points_selector=qdrant_models.FilterSelector(
                    filter=qdrant_models.Filter(
                        must=[
                            qdrant_models.FieldCondition(
                                key="doc_id",
                                match=qdrant_models.MatchValue(value=str(doc_id)),
                            )
                        ]
                    )
                ),
            )
        except Exception:
            pass

    # 清除旧 Meilisearch 索引
    meili = _get_meilisearch()
    if meili is not None:
        try:
            index = meili.index("knowledge_documents")
            index.delete_document(str(doc_id))
        except Exception:
            pass

    # 重新索引
    return await index_document(db, doc_id)


# ═══════════════════════════════════════════════════════════════════
# 对话 CRUD
# ═══════════════════════════════════════════════════════════════════


async def list_conversations(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """分页查询对话历史列表"""
    base_filter = KnowledgeConversation.user_id == user_id

    count_stmt = select(func.count(KnowledgeConversation.id)).where(base_filter)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    stmt = (
        select(KnowledgeConversation)
        .where(base_filter)
        .order_by(KnowledgeConversation.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    return {"items": items, "total": total}


async def create_conversation(
    db: AsyncSession,
    title: str,
    messages: list[dict],
    user_id: UUID,
) -> KnowledgeConversation:
    """创建/保存对话"""
    conv = KnowledgeConversation(
        id=uuid.uuid4(),
        title=title,
        messages=messages,
        user_id=user_id,
    )
    db.add(conv)
    await db.flush()
    await db.refresh(conv)
    return conv


async def update_conversation(
    db: AsyncSession,
    conv_id: uuid.UUID,
    title: Optional[str] = None,
    messages: Optional[list[dict]] = None,
) -> Optional[KnowledgeConversation]:
    """更新对话"""
    result = await db.execute(
        select(KnowledgeConversation).where(KnowledgeConversation.id == conv_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        return None

    if title is not None:
        conv.title = title
    if messages is not None:
        conv.messages = messages

    await db.flush()
    await db.refresh(conv)
    return conv


async def get_conversation(
    db: AsyncSession, conv_id: uuid.UUID
) -> Optional[KnowledgeConversation]:
    """获取单个对话详情"""
    result = await db.execute(
        select(KnowledgeConversation).where(KnowledgeConversation.id == conv_id)
    )
    return result.scalar_one_or_none()


# ═══════════════════════════════════════════════════════════════════
# 统计
# ═══════════════════════════════════════════════════════════════════


async def get_stats(db: AsyncSession, user_id: UUID) -> dict:
    """获取知识库统计信息"""
    base_filter = KnowledgeDocument.user_id == user_id

    count_stmt = select(func.count(KnowledgeDocument.id)).where(base_filter)
    total_result = await db.execute(count_stmt)
    total_docs = total_result.scalar() or 0

    chunk_stmt = select(func.sum(KnowledgeDocument.chunk_count)).where(base_filter)
    chunk_result = await db.execute(chunk_stmt)
    total_chunks = chunk_result.scalar() or 0

    last_stmt = (
        select(KnowledgeDocument.updated_at)
        .where(base_filter)
        .order_by(KnowledgeDocument.updated_at.desc())
        .limit(1)
    )
    last_result = await db.execute(last_stmt)
    last_updated = last_result.scalar_one_or_none()

    return {
        "total_documents": total_docs,
        "total_chunks": int(total_chunks or 0),
        "last_updated_at": last_updated.isoformat() if last_updated else None,
    }
