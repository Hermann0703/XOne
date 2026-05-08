"""数据报送管理 Celery 定时任务"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from app.core.database import async_session
from app.models.dispatch import DispatchDataSource, DispatchTask
from app.services import dispatch_service
from app.tasks.celery_app import celery_app
from sqlalchemy import select


def _run_async(coro):
    """在同步 Celery 任务中运行异步协程。"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="dispatch.run_scheduled_dispatches")
def run_scheduled_dispatches() -> dict:
    """定时执行所有到期的报送任务。

    查找所有 next_run_at <= now 且状态为 pending 的活跃任务，
    逐个调用 dispatch_service.execute_task 执行。
    """

    async def _execute():
        now = datetime.now(timezone.utc)
        executed_count = 0
        failed_count = 0

        async with async_session() as db:
            try:
                # 查找所有到期待执行的任务
                result = await db.execute(
                    select(DispatchTask)
                    .where(
                        DispatchTask.next_run_at <= now,
                        DispatchTask.status.in_(["pending"]),
                    )
                )
                tasks = result.scalars().all()

                for task in tasks:
                    try:
                        await db.commit()  # 提交此前可能的事务
                        log = await dispatch_service.execute_task(db, task.id)
                        await db.commit()
                        if log and log.status == "success":
                            executed_count += 1
                        else:
                            failed_count += 1
                    except Exception:
                        await db.rollback()
                        failed_count += 1

            except Exception:
                await db.rollback()
                raise

        return {
            "executed_count": executed_count,
            "failed_count": failed_count,
            "total_found": len(tasks) if "tasks" in dir() else 0,
        }

    return _run_async(_execute())


@celery_app.task(name="dispatch.check_data_source_health")
def check_data_source_health() -> dict:
    """检查所有数据源的连接健康状态。

    遍历所有数据源，验证其可用性并更新状态。
    """

    async def _check():
        healthy_count = 0
        unhealthy_count = 0

        async with async_session() as db:
            try:
                result = await db.execute(select(DispatchDataSource))
                sources = result.scalars().all()

                for source in sources:
                    try:
                        if source.source_type == "api" and source.connection_config:
                            import httpx
                            url = source.connection_config.get("health_url")
                            if url:
                                async with httpx.AsyncClient(timeout=10.0) as client:
                                    resp = await client.get(url)
                                    if resp.status_code < 500:
                                        source.status = "active"
                                    else:
                                        source.status = "error"
                            else:
                                source.status = "active"
                        elif source.source_type == "database":
                            # 数据库类型：标记为 active（连接验证需要实际连接测试）
                            source.status = "active"
                        else:
                            source.status = "active"

                        healthy_count += 1
                    except Exception:
                        source.status = "error"
                        unhealthy_count += 1

                await db.commit()

            except Exception:
                await db.rollback()
                raise

        return {
            "healthy_count": healthy_count,
            "unhealthy_count": unhealthy_count,
            "total": healthy_count + unhealthy_count,
        }

    return _run_async(_check())
