from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.services.moderation_service import ModerationService
from app.api.routes.auth import get_reviewer_user

router = APIRouter()


class RejectRequest(BaseModel):
    """Запрос на отклонение записи."""
    reason: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    """Запрос на обновление статуса публикации."""
    publish_status: str


async def get_moderation_service(db: AsyncSession = Depends(get_db)) -> ModerationService:
    """Получить сервис модерации."""
    return ModerationService(db)


@router.get("/pending")
async def get_pending_items(
    reviewer: User = Depends(get_reviewer_user),
    moderation_service: ModerationService = Depends(get_moderation_service),
):
    """Получить все записи, ожидающие проверки (только для ревьюверов)."""
    return await moderation_service.get_pending_items()


@router.post("/incidents/{incident_id}/approve")
async def approve_incident(
    incident_id: int,
    reviewer: User = Depends(get_reviewer_user),
    moderation_service: ModerationService = Depends(get_moderation_service),
):
    """Одобрить инцидент (только для ревьюверов)."""
    try:
        incident = await moderation_service.approve_incident(incident_id, reviewer)
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        return {"message": "Incident approved", "id": incident.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/incidents/{incident_id}/reject")
async def reject_incident(
    incident_id: int,
    data: RejectRequest,
    reviewer: User = Depends(get_reviewer_user),
    moderation_service: ModerationService = Depends(get_moderation_service),
):
    """Отклонить и удалить инцидент (только для ревьюверов)."""
    try:
        result = await moderation_service.reject_incident(incident_id, reviewer, data.reason)
        if not result:
            raise HTTPException(status_code=404, detail="Incident not found")
        return {"message": "Incident rejected and deleted", "id": result["id"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/guides/{guide_id}/approve")
async def approve_guide(
    guide_id: int,
    reviewer: User = Depends(get_reviewer_user),
    moderation_service: ModerationService = Depends(get_moderation_service),
):
    """Одобрить гайд (только для ревьюверов)."""
    try:
        guide = await moderation_service.approve_guide(guide_id, reviewer)
        if not guide:
            raise HTTPException(status_code=404, detail="Guide not found")
        return {"message": "Guide approved", "id": guide.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/guides/{guide_id}/reject")
async def reject_guide(
    guide_id: int,
    data: RejectRequest,
    reviewer: User = Depends(get_reviewer_user),
    moderation_service: ModerationService = Depends(get_moderation_service),
):
    """Отклонить и удалить гайд (только для ревьюверов)."""
    try:
        result = await moderation_service.reject_guide(guide_id, reviewer, data.reason)
        if not result:
            raise HTTPException(status_code=404, detail="Guide not found")
        return {"message": "Guide rejected and deleted", "id": result["id"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/incidents/{incident_id}/status")
async def update_incident_status(
    incident_id: int,
    data: StatusUpdateRequest,
    reviewer: User = Depends(get_reviewer_user),
    moderation_service: ModerationService = Depends(get_moderation_service),
):
    """Обновить статус публикации инцидента (только для ревьюверов)."""
    try:
        incident = await moderation_service.update_incident_status(incident_id, data.publish_status)
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        return {"message": "Status updated", "id": incident.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/guides/{guide_id}/status")
async def update_guide_status(
    guide_id: int,
    data: StatusUpdateRequest,
    reviewer: User = Depends(get_reviewer_user),
    moderation_service: ModerationService = Depends(get_moderation_service),
):
    """Обновить статус публикации гайда (только для ревьюверов)."""
    try:
        guide = await moderation_service.update_guide_status(guide_id, data.publish_status)
        if not guide:
            raise HTTPException(status_code=404, detail="Guide not found")
        return {"message": "Status updated", "id": guide.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
