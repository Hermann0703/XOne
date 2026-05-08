"""RAG 检索增强生成服务 — 向量检索 + 上下文拼接 + 答案生成"""

from __future__ import annotations

import uuid
from typing import Optional

from app.core.config import settings


# ── 客户端懒加载 ──

_qdrant_client = None
_embedding_model = None
_collection_name = "knowledge_chunks"


def _get_qdrant():
    global _qdrant_client
    if _qdrant_client is None:
        try:
            from qdrant_client import QdrantClient
            _qdrant_client = QdrantClient(url=settings.QDRANT_URL, timeout=10)
            _qdrant_client.get_collections()
        except Exception:
            _qdrant_client = False  # type: ignore
    return _qdrant_client if _qdrant_client is not False else None


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception:
            _embedding_model = False  # type: ignore
    return _embedding_model if _embedding_model is not False else None


def _get_embedding(text: str) -> list[float]:
    """文本向量化"""
    model = _get_embedding_model()
    if model is None:
        return [0.0] * 384
    return model.encode(text).tolist()


def _build_prompt(question: str, contexts: list[dict], history: Optional[list[dict]] = None) -> str:
    """构造 RAG prompt"""
    history_text = ""
    if history:
        history_parts = []
        for msg in history[-10:]:  # 最近 10 条
            role = "用户" if msg.get("role") == "user" else "助手"
            history_parts.append(f"{role}: {msg.get('content', '')}")
        history_text = "\n".join(history_parts)

    context_text = "\n\n---\n\n".join(
        f"[来源 {i+1}: {ctx['title']}]\n{ctx['text']}"
        for i, ctx in enumerate(contexts)
    )

    prompt_parts = []
    prompt_parts.append("你是一个知识库助手。请根据以下参考资料回答用户的问题。")
    prompt_parts.append("如果参考资料中没有相关信息，请如实告知用户，不要编造答案。")
    prompt_parts.append("回答时请引用相关的来源编号。")

    if history_text:
        prompt_parts.append(f"\n## 对话历史\n{history_text}")

    prompt_parts.append(f"\n## 参考资料\n{context_text}")
    prompt_parts.append(f"\n## 用户问题\n{question}")
    prompt_parts.append("\n## 回答")

    return "\n".join(prompt_parts)


async def ask_question(
    question: str,
    history: Optional[list[dict]] = None,
    top_k: int = 5,
) -> dict:
    """
    RAG 问答：
    1. 向量化问题
    2. Qdrant 检索 top_k 个相关分块
    3. 构造 prompt
    4. 返回答案 + 引用文档列表

    返回格式: {"answer": str, "sources": [{"doc_id": str, "title": str, "snippet": str}]}
    """
    qdrant = _get_qdrant()

    if qdrant is None:
        return {
            "answer": "知识库向量数据库（Qdrant）当前不可用，请稍后重试。如需立即使用，请确认 Qdrant 服务已启动。",
            "sources": [],
        }

    # 向量化问题
    query_vector = _get_embedding(question)

    # Qdrant 检索
    try:
        results = qdrant.search(
            collection_name=_collection_name,
            query_vector=query_vector,
            limit=top_k,
        )
    except Exception:
        return {
            "answer": "知识库向量检索失败，可能索引尚未创建。请先上传并索引文档后再试。",
            "sources": [],
        }

    if not results:
        return {
            "answer": "未找到与您问题相关的知识库内容。请尝试修改问题或上传相关文档。",
            "sources": [],
        }

    # 构建上下文
    contexts = []
    sources = []
    seen_docs = set()

    for r in results:
        payload = r.payload or {}
        snippet = (payload.get("text", "") or "")[:200]
        doc_id = payload.get("doc_id", "")

        contexts.append({
            "title": payload.get("title", "未知文档"),
            "text": payload.get("text", ""),
        })

        if doc_id and doc_id not in seen_docs:
            seen_docs.add(doc_id)
            sources.append({
                "doc_id": doc_id,
                "title": payload.get("title", "未知文档"),
                "snippet": snippet,
            })

    # 构造 prompt（实际生产环境应调用 LLM API，此处返回 prompt 作为 placeholder）
    prompt = _build_prompt(question, contexts, history)

    answer = (
        f"[RAG Prompt 已生成，待接入 LLM API]\n\n"
        f"检索到 {len(results)} 个相关分块，来自 {len(sources)} 篇文档。\n\n"
        f"--- Prompt Preview ---\n{prompt[:800]}..."
        if len(prompt) > 800
        else prompt
    )

    return {
        "answer": answer,
        "sources": sources,
    }
