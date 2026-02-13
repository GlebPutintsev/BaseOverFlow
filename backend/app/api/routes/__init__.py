from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.routes import services, incidents, guides, tags, search, auth, votes, moderation, notifications, comments
from app.database import get_db
from app.models import Incident, Guide, Service

api_router = APIRouter()

api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(guides.router, prefix="/guides", tags=["guides"])
api_router.include_router(tags.router, prefix="/tags", tags=["tags"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(votes.router, prefix="/votes", tags=["votes"])
api_router.include_router(moderation.router, prefix="/moderation", tags=["moderation"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(comments.router, tags=["comments"])


class StatsResponse(BaseModel):
    total_incidents: int
    total_guides: int
    total_services: int


@api_router.get("/stats", response_model=StatsResponse, tags=["stats"])
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Получить общую статистику."""
    incidents_count = await db.execute(select(func.count()).select_from(Incident))
    guides_count = await db.execute(select(func.count()).select_from(Guide))
    services_count = await db.execute(select(func.count()).select_from(Service))
    
    return StatsResponse(
        total_incidents=incidents_count.scalar() or 0,
        total_guides=guides_count.scalar() or 0,
        total_services=services_count.scalar() or 0,
    )


class HealthResponse(BaseModel):
    status: str
    version: str


@api_router.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    from app.config import settings
    return HealthResponse(status="healthy", version=settings.APP_VERSION)

