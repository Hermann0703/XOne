from fastapi import APIRouter

from app.api.personal.reading import router as reading_router
from app.api.personal.media import router as media_router
from app.api.personal.assets import router as assets_router
from app.api.personal.shopping import router as shopping_router
from app.api.personal.notifications import router as notifications_router
from app.api.personal import health
from app.api.work.contracts import router as contracts_router
from app.api.work.archives import router as archives_router
from app.api.work.storage import router as storage_router
from app.api.work.knowledge import router as knowledge_router
from app.api.work.dispatch import router as dispatch_router
from app.api.work.search import router as search_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(reading_router, prefix="/personal", tags=["个人-阅读"])
api_router.include_router(media_router, prefix="/personal", tags=["个人-观影"])
api_router.include_router(health.router, prefix="/personal/health", tags=["个人-健康"])
api_router.include_router(assets_router, prefix="/personal", tags=["个人-资产"])
api_router.include_router(shopping_router, prefix="/personal", tags=["个人-购物"])
api_router.include_router(notifications_router, prefix="/personal", tags=["通知"])
api_router.include_router(contracts_router, prefix="/work", tags=["工作-合同"])
api_router.include_router(archives_router, prefix="/work", tags=["工作-档案"])
api_router.include_router(storage_router, prefix="/work", tags=["工作-存储"])
api_router.include_router(dispatch_router, prefix="/work", tags=["工作-数据报送"])
api_router.include_router(knowledge_router, prefix="/work", tags=["工作-知识库"])
api_router.include_router(search_router, prefix="/work", tags=["全局搜索"])
