from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.notification import NotificationType
from app.services.notification_service import NotificationService
from app.api.routes.auth import get_current_user

router = APIRouter()


class NotificationResponse(BaseModel):
    """Ответ для уведомления."""
    id: int
    type: NotificationType
    title: str
    message: Optional[str]
    link: Optional[str]
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime]
    
    class Config:
        from_attributes = True


async def get_notification_service(db: AsyncSession = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


@router.get("", response_model=list[NotificationResponse])
async def get_notifications(
    user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
):
    """Получить уведомления текущего пользователя."""
    return await notification_service.get_user_notifications(
        user_id=user.id,
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )


@router.get("/count")
async def get_unread_count(
    user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Получить количество непрочитанных уведомлений."""
    count = await notification_service.get_unread_count(user.id)
    return {"unread_count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """заметить уведомление как прочитанное."""
    notification = await notification_service.mark_as_read(notification_id, user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@router.post("/read-all")
async def clear_all_notifications(
    user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    """Удалить все уведомления.(прочитать)"""
    count = await notification_service.delete_all_notifications(user.id)
    return {"deleted": count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
):
    deleted = await notification_service.delete_notification(notification_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}
