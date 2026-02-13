"""
Сервис уведомлений для пользователей.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationService:
    """Сервис для операций с уведомлениями."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_user_notifications(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Notification]:
        """Получить уведомления для пользователя."""
        query = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        
        if unread_only:
            query = query.where(Notification.is_read == False)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_unread_count(self, user_id: int) -> int:
        """Получить количество непрочитанных уведомлений."""
        result = await self.db.execute(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        )
        return result.scalar() or 0
    
    async def mark_as_read(self, notification_id: int, user_id: int) -> Optional[Notification]:
        """Отметить уведомление как прочитанное."""
        notification = await self.db.get(Notification, notification_id)
        if not notification or notification.user_id != user_id:
            return None
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        await self.db.flush()
        return notification
    
    async def mark_all_as_read(self, user_id: int) -> int:
        """Отметить все уведомления как прочитанные для пользователя."""
        result = await self.db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
            .values(is_read=True, read_at=datetime.utcnow())
        )
        await self.db.flush()
        return result.rowcount
    
    async def delete_all_notifications(self, user_id: int) -> int:
        """Удалить все уведомления для пользователя."""
        result = await self.db.execute(
            select(Notification).where(Notification.user_id == user_id)
        )
        notifications = result.scalars().all()
        count = len(notifications)
        
        for notif in notifications:
            await self.db.delete(notif)
        
        await self.db.flush()
        return count
    
    async def delete_notification(self, notification_id: int, user_id: int) -> bool:
        """Удалить уведомление."""
        notification = await self.db.get(Notification, notification_id)
        if not notification or notification.user_id != user_id:
            return False
        
        await self.db.delete(notification)
        await self.db.flush()
        return True
