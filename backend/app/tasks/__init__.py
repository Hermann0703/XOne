"""Celery 应用 — 异步任务调度"""

from celery import Celery
from celery.schedules import crontab

celery_app = Celery("xone")

celery_app.config_from_object("app.tasks.celeryconfig")

# 自动发现任务模块
celery_app.autodiscover_tasks(["app.tasks"])

# ── Beat 定时调度 ──
celery_app.conf.beat_schedule = {
    "check-auto-renewal": {
        "task": "app.tasks.lifecycle_tasks.check_auto_renewal",
        "schedule": crontab(hour=2, minute=0),  # 每天凌晨 2:00
        "options": {"queue": "celery"},
    },
}
