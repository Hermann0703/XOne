"""Celery 应用 — 异步任务调度"""

from celery import Celery

celery_app = Celery("xone")

celery_app.config_from_object("app.tasks.celeryconfig")

# 自动发现任务模块
celery_app.autodiscover_tasks(["app.tasks"])
