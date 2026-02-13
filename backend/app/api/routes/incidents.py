from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import IncidentServiceDep
from app.models.incident import Severity, Status, PublishStatus
from app.models.user import User, UserRole
from app.schemas import IncidentCreate, IncidentUpdate, IncidentResponse, IncidentList
from app.api.routes.auth import get_current_user, get_reviewer_user
from app.services.moderation_service import ModerationService
from app.database import get_db

router = APIRouter()


@router.get("", response_model=list[IncidentList])
async def list_incidents(
    incident_service: IncidentServiceDep,
    service_id: Optional[int] = None,
    severity: Optional[Severity] = None,
    status: Optional[Status] = None,
    tag_ids: Optional[str] = Query(None, description="Comma-separated tag IDs"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Получить все инциденты с опциональными фильтрами."""
    tag_id_list = [int(t) for t in tag_ids.split(",")] if tag_ids else None
    incidents, _ = await incident_service.get_all(
        service_id=service_id,
        severity=severity,
        status=status,
        tag_ids=tag_id_list,
        limit=limit,
        offset=offset,
    )
    return incidents


@router.get("/recent", response_model=list[IncidentList])
async def get_recent_incidents(
    incident_service: IncidentServiceDep,
    limit: int = Query(10, ge=1, le=50),
):
    return await incident_service.get_recent(limit)


@router.get("/popular", response_model=list[IncidentList])
async def get_popular_incidents(
    incident_service: IncidentServiceDep,
    limit: int = Query(10, ge=1, le=50),
):
    return await incident_service.get_popular(limit)


@router.get("/pinned", response_model=list[IncidentList])
async def get_pinned_incidents(
    incident_service: IncidentServiceDep,
    service_id: Optional[int] = None,
):
    return await incident_service.get_pinned(service_id)


@router.get("/top-rated", response_model=list[IncidentResponse])
async def get_top_rated_incidents(
    incident_service: IncidentServiceDep,
    limit: int = Query(10, ge=1, le=50),
):
    return await incident_service.get_top_rated(limit)


@router.get("/slug/{slug}", response_model=IncidentResponse)
async def get_incident_by_slug(slug: str, incident_service: IncidentServiceDep):
    result = await incident_service.get_by_slug(slug)
    if not result:
        raise HTTPException(status_code=404, detail="Incident not found")
    await incident_service.increment_views(result.id)
    return await incident_service.get_by_id(result.id)


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: int, incident_service: IncidentServiceDep):
    result = await incident_service.get_by_id(incident_id)
    if not result:
        raise HTTPException(status_code=404, detail="Incident not found")
    await incident_service.increment_views(incident_id)
    return await incident_service.get_by_id(incident_id)


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    data: IncidentCreate,
    incident_service: IncidentServiceDep,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in [UserRole.ADMIN, UserRole.REVIEWER]:
        publish_status = PublishStatus.PUBLISHED
    else:
        publish_status = PublishStatus.PENDING
    
    incident = await incident_service.create(
        data,
        author_id=current_user.id,
        author_name=current_user.display_name or current_user.username,
        publish_status=publish_status,
    )
    
    if publish_status == PublishStatus.PENDING:
        moderation_service = ModerationService(db)
        await moderation_service.notify_reviewers_new_item(
            item_type="инцидент",
            item_title=incident.title,
            item_link=f"/incident/{incident.slug}",
        )
    
    return incident


@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    data: IncidentUpdate,
    incident_service: IncidentServiceDep,
    current_user: User = Depends(get_current_user),
):
    incident = await incident_service.get_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    if incident.author_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this incident")
    
    result = await incident_service.update(incident_id, data)
    return result


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(
    incident_id: int,
    incident_service: IncidentServiceDep,
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="Only admins and reviewers can delete incidents")
    
    deleted = await incident_service.delete(incident_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Incident not found")

