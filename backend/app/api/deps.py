from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import (
    ServiceService,
    IncidentService,
    GuideService,
    TagService,
    SearchService,
)


async def get_service_service(
    db: Annotated[AsyncSession, Depends(get_db)]
) -> ServiceService:
    return ServiceService(db)


async def get_incident_service(
    db: Annotated[AsyncSession, Depends(get_db)]
) -> IncidentService:
    return IncidentService(db)


async def get_guide_service(
    db: Annotated[AsyncSession, Depends(get_db)]
) -> GuideService:
    return GuideService(db)


async def get_tag_service(
    db: Annotated[AsyncSession, Depends(get_db)]
) -> TagService:
    return TagService(db)


async def get_search_service(
    db: Annotated[AsyncSession, Depends(get_db)]
) -> SearchService:
    return SearchService(db)


ServiceServiceDep = Annotated[ServiceService, Depends(get_service_service)]
IncidentServiceDep = Annotated[IncidentService, Depends(get_incident_service)]
GuideServiceDep = Annotated[GuideService, Depends(get_guide_service)]
TagServiceDep = Annotated[TagService, Depends(get_tag_service)]
SearchServiceDep = Annotated[SearchService, Depends(get_search_service)]

