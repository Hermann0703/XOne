"""Celery 配置"""

# Broker: Redis (从环境变量读取，开发默认)
import os

broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

# 任务配置
task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]
timezone = "Asia/Shanghai"
enable_utc = True
task_track_started = True
task_acks_late = True
worker_prefetch_multiplier = 1  # 公平调度
