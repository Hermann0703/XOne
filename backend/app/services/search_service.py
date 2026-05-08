"""全局搜索服务 — Meilisearch 封装层

提供索引管理、文档索引、全局搜索功能。
跨 contracts / archives / knowledge / dispatch 四个索引。
"""

from __future__ import annotations

import logging
from typing import Any

import meilisearch

from app.core.config import settings

logger = logging.getLogger(__name__)

# 搜索索引名称常量
INDEX_CONTRACTS = "contracts"
INDEX_ARCHIVES = "archives"
INDEX_KNOWLEDGE = "knowledge"
INDEX_DISPATCH = "dispatch"

ALL_INDICES = [INDEX_CONTRACTS, INDEX_ARCHIVES, INDEX_KNOWLEDGE, INDEX_DISPATCH]

# 每个索引的可搜索字段
SEARCHABLE_ATTRIBUTES = ["title", "content", "summary"]


class MeilisearchClient:
    """Meilisearch 客户端包装 — 管理索引与文档搜索。"""

    def __init__(self) -> None:
        self._client = meilisearch.Client(settings.MEILISEARCH_URL, settings.MEILISEARCH_KEY)
        logger.info("Meilisearch 客户端已初始化: %s", settings.MEILISEARCH_URL)

    # ── 索引管理 ─────────────────────────────────────────────────

    def create_indices(self) -> dict[str, Any]:
        """创建 contracts / archives / knowledge / dispatch 四个索引。

        若索引已存在则跳过；设置可搜索字段为 title/content/summary。
        """
        results: dict[str, Any] = {}
        for index_name in ALL_INDICES:
            try:
                self._client.create_index(index_name, {"primaryKey": "id"})
                logger.info("索引 %s 创建成功", index_name)
                results[index_name] = "created"
            except meilisearch.errors.MeilisearchApiError as e:
                if e.code == "index_already_exists":
                    logger.info("索引 %s 已存在，跳过创建", index_name)
                    results[index_name] = "already_exists"
                else:
                    logger.error("索引 %s 创建失败: %s", index_name, e)
                    results[index_name] = f"error: {e}"

            # 设置可搜索字段
            try:
                idx = self._client.index(index_name)
                idx.update_searchable_attributes(SEARCHABLE_ATTRIBUTES)
                logger.info("索引 %s 可搜索字段已设置: %s", index_name, SEARCHABLE_ATTRIBUTES)
            except Exception as e:
                logger.error("索引 %s 设置可搜索字段失败: %s", index_name, e)

        return results

    # ── 文档操作 ─────────────────────────────────────────────────

    def index_document(self, index: str, doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
        """索引单个文档。

        Args:
            index: 索引名称 (contracts/archives/knowledge/dispatch)
            doc_id: 文档唯一标识
            data: 文档数据，需包含 title/content/summary 等字段

        Returns:
            Meilisearch 任务信息
        """
        idx = self._client.index(index)
        document = {"id": doc_id, **data}
        result = idx.add_documents([document])
        logger.info("文档已索引: index=%s id=%s", index, doc_id)
        return result

    def search_global(self, query: str, limit: int = 20) -> dict[str, Any]:
        """跨所有索引执行全局搜索。

        Args:
            query: 搜索关键词
            limit: 每索引返回的最大结果数

        Returns:
            {"results": [...], "total": int} 合并后的搜索结果
        """
        all_hits: list[dict[str, Any]] = []
        total_hits = 0

        for index_name in ALL_INDICES:
            try:
                idx = self._client.index(index_name)
                result = idx.search(query, {"limit": limit})
                hits = result.get("hits", [])
                # 为每条结果附加来源索引信息
                for hit in hits:
                    hit["_index"] = index_name
                all_hits.extend(hits)
                total_hits += result.get("estimatedTotalHits", len(hits))
            except Exception as e:
                logger.error("搜索索引 %s 失败: %s", index_name, e)

        # 按 Meilisearch 默认排名排序（相关性优先）
        # 结果已在各索引内排序，直接扩展即可

        return {
            "results": all_hits,
            "total": total_hits,
        }

    def delete_document(self, index: str, doc_id: str) -> dict[str, Any]:
        """删除索引中的指定文档。

        Args:
            index: 索引名称
            doc_id: 文档唯一标识

        Returns:
            Meilisearch 任务信息
        """
        idx = self._client.index(index)
        result = idx.delete_document(doc_id)
        logger.info("文档已删除: index=%s id=%s", index, doc_id)
        return result

    def delete_all_documents(self, index: str) -> dict[str, Any]:
        """清空指定索引中的所有文档。

        Args:
            index: 索引名称

        Returns:
            Meilisearch 任务信息
        """
        idx = self._client.index(index)
        result = idx.delete_all_documents()
        logger.info("索引 %s 所有文档已清空", index)
        return result


# 全局单例
_search_client: MeilisearchClient | None = None


def get_search_client() -> MeilisearchClient:
    """获取全局 Meilisearch 客户端单例。"""
    global _search_client
    if _search_client is None:
        _search_client = MeilisearchClient()
        # 启动时创建索引
        _search_client.create_indices()
    return _search_client
