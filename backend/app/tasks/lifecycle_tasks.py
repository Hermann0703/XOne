"""生命周期自动续约定时任务

每天凌晨 2:00 执行，检查所有启用自动续约的合同：
- 合同到期前 N 天 (renewal_remind_days) → 自动推进到下一生命周期阶段
- 推送通知 (预留)
"""

import logging
from datetime import date, timedelta

from app.tasks import celery_app
from app.core.database import async_session
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.models.contract import Contract, LifecycleStage, ContractStageLog

logger = logging.getLogger(__name__)


@celery_app.task(name="check_auto_renewal")
def check_auto_renewal():
    """检查并执行自动续约

    逻辑:
    1. 查找 auto_renewal=True 且已绑定生命周期的合同
    2. 若合同 end_date 在 renew_remind_days 范围内 → 推进到下一阶段
    3. 当前阶段 auto_transition_days > 0 且到期日在范围内 → 自动推进
    """
    import asyncio

    return asyncio.get_event_loop().run_until_complete(_check_auto_renewal_async())


async def _check_auto_renewal_async():
    today = date.today()

    async with async_session() as db:
        # 查询所有 auto_renewal=True 且有生命周期的合同
        stmt = (
            select(Contract)
            .where(
                and_(
                    Contract.auto_renewal == True,
                    Contract.lifecycle_id.isnot(None),
                    Contract.lifecycle_stage_id.isnot(None),
                    Contract.end_date.isnot(None),
                )
            )
            .options(
                selectinload(Contract.lifecycle_stage),
                selectinload(Contract.lifecycle).selectinload(LifecycleStage.template),
            )
        )
        result = await db.execute(stmt)
        contracts = result.scalars().all()

        advanced_count = 0
        skipped_count = 0
        error_count = 0

        for contract in contracts:
            try:
                stage = contract.lifecycle_stage
                if not stage:
                    skipped_count += 1
                    continue

                days_until_end = (contract.end_date - today).days

                # 条件1: 当前阶段设置了 auto_transition_days
                if stage.auto_transition_days > 0:
                    # 到期前 auto_transition_days 天内 → 自动推进
                    if days_until_end <= stage.auto_transition_days and days_until_end >= 0:
                        # 执行推进
                        from app.services.contract_service import advance_contract
                        result = await advance_contract(
                            db, contract.id,
                            triggered_by="auto",
                            notes=f"自动续约: 到期前 {days_until_end} 天触发 (auto_transition_days={stage.auto_transition_days})"
                        )
                        if result and not result.get("error"):
                            advanced_count += 1
                            logger.info(
                                f"合同 {contract.contract_no} (id={contract.id}) "
                                f"自动续约成功: {stage.name} → 下一阶段"
                            )
                            await db.commit()
                        else:
                            skipped_count += 1
                    else:
                        skipped_count += 1
                else:
                    # 条件2: 使用合同的 renewal_remind_days 作为降级策略
                    # 在到期前 renewal_remind_days 天内推进
                    if 0 <= days_until_end <= contract.renewal_remind_days:
                        from app.services.contract_service import advance_contract
                        result = await advance_contract(
                            db, contract.id,
                            triggered_by="auto",
                            notes=f"自动续约 (降级): 到期前 {days_until_end} 天, remind_days={contract.renewal_remind_days}"
                        )
                        if result and not result.get("error"):
                            advanced_count += 1
                            logger.info(
                                f"合同 {contract.contract_no} (id={contract.id}) "
                                f"自动续约成功 (降级策略)"
                            )
                            await db.commit()
                        else:
                            skipped_count += 1
                    else:
                        skipped_count += 1

            except Exception as e:
                error_count += 1
                logger.error(
                    f"合同 {contract.id} 自动续约失败: {e}", exc_info=True
                )

        logger.info(
            f"自动续约检查完成: 推进 {advanced_count}, 跳过 {skipped_count}, 失败 {error_count}"
        )

        return {
            "advanced": advanced_count,
            "skipped": skipped_count,
            "errors": error_count,
        }
