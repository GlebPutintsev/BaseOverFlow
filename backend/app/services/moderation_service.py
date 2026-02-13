"""
Сервис модерации для проверки и одобрения контента.
"""
from typing import Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.incident import Incident, PublishStatus as IncidentPublishStatus
from app.models.guide import Guide, PublishStatus as GuidePublishStatus
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole


class ModerationService:
    """Сервис для модерации контента."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_pending_items(self) -> dict:
        """Получить все элементы, ожидающие проверки."""
        # Ожидающие инциденты - использовать строковое значение для совместимости с SQLite (Нужно перейти на postgres в ближайше будущем)
        incidents_result = await self.db.execute(
            select(Incident)
            .options(selectinload(Incident.service), selectinload(Incident.tags))
            .where(Incident.publish_status == "pending")
            .order_by(Incident.created_at.desc())
        )
        incidents = list(incidents_result.scalars().all())
        
        guides_result = await self.db.execute(
            select(Guide)
            .options(selectinload(Guide.service), selectinload(Guide.tags))
            .where(Guide.publish_status == "pending")
            .order_by(Guide.created_at.desc())
        )
        guides = list(guides_result.scalars().all())
        
        # Преобразовать в унифицированный формат для frontend
        items = []
        for inc in incidents:
            status = inc.publish_status.value if hasattr(inc.publish_status, 'value') else str(inc.publish_status)
            items.append({
                "id": inc.id,
                "type": "incident",
                "title": inc.title,
                "slug": inc.slug,
                "author": inc.author,
                "service_name": inc.service.name if inc.service else "",
                "publish_status": status,
                "created_at": inc.created_at.isoformat(),
            })
        for g in guides:
            status = g.publish_status.value if hasattr(g.publish_status, 'value') else str(g.publish_status)
            items.append({
                "id": g.id,
                "type": "guide",
                "title": g.title,
                "slug": g.slug,
                "author": g.author,
                "service_name": g.service.name if g.service else "",
                "publish_status": status,
                "created_at": g.created_at.isoformat(),
            })
        
        # Сортировка по created_at по убыванию
        items.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {
            "items": items,
            "total": len(items),
        }
    
    async def approve_incident(self, incident_id: int, reviewer: User) -> Optional[Incident]:
        """Одобрить инцидент для публикации."""
        incident = await self.db.get(Incident, incident_id)
        if not incident:
            return None
        
        status_value = incident.publish_status.value if hasattr(incident.publish_status, 'value') else str(incident.publish_status)
        if status_value != "pending":
            raise ValueError("Incident is not pending review")
        
        incident.publish_status = IncidentPublishStatus.PUBLISHED
        
        # Уведомить автора
        if incident.author_id:
            await self._create_notification(
                user_id=incident.author_id,
                type=NotificationType.ITEM_APPROVED,
                title="Ваш инцидент одобрен",
                message=f"Инцидент '{incident.title}' был одобрен и опубликован.",
                link=f"/incident/{incident.slug}",
            )
        
        await self.db.flush()
        return incident
    
    async def reject_incident(
        self,
        incident_id: int,
        reviewer: User,
        reason: Optional[str] = None,
    ) -> dict:
        """Отклонить и удалить инцидент."""
        incident = await self.db.get(Incident, incident_id)
        if not incident:
            return None
        
        status_value = incident.publish_status.value if hasattr(incident.publish_status, 'value') else str(incident.publish_status)
        if status_value != "pending":
            raise ValueError("Incident is not pending review")
        
        # Сохранить информацию для уведомления перед удалением
        incident_title = incident.title
        author_id = incident.author_id
        incident_id_saved = incident.id
        
        if author_id:
            message = f"Инцидент '{incident_title}' был отклонён."
            if reason:
                message += f"\n\nПричина: {reason}"
            
            await self._create_notification(
                user_id=author_id,
                type=NotificationType.ITEM_REJECTED,
                title="Ваш инцидент отклонён",
                message=message,
                link=None,  # Нет ссылки, так как элемент удален
            )
        
        await self.db.delete(incident)
        await self.db.flush()
        
        return {"id": incident_id_saved, "deleted": True}
    
    async def approve_guide(self, guide_id: int, reviewer: User) -> Optional[Guide]:
        """Одобрить гайд для публикации."""
        guide = await self.db.get(Guide, guide_id)
        if not guide:
            return None
        
        status_value = guide.publish_status.value if hasattr(guide.publish_status, 'value') else str(guide.publish_status)
        if status_value != "pending":
            raise ValueError("Guide is not pending review")
        
        guide.publish_status = GuidePublishStatus.PUBLISHED
        
        if guide.author_id:
            await self._create_notification(
                user_id=guide.author_id,
                type=NotificationType.ITEM_APPROVED,
                title="Ваш гайд одобрен",
                message=f"Гайд '{guide.title}' был одобрен и опубликован.",
                link=f"/guide/{guide.slug}",
            )
        
        await self.db.flush()
        return guide
    
    async def reject_guide(
        self,
        guide_id: int,
        reviewer: User,
        reason: Optional[str] = None,
    ) -> dict:
        """Отклонить и удалить гайд."""
        guide = await self.db.get(Guide, guide_id)
        if not guide:
            return None
        
        status_value = guide.publish_status.value if hasattr(guide.publish_status, 'value') else str(guide.publish_status)
        if status_value != "pending":
            raise ValueError("Guide is not pending review")
        
        guide_title = guide.title
        author_id = guide.author_id
        guide_id_saved = guide.id
        
        if author_id:
            message = f"Гайд '{guide_title}' был отклонён."
            if reason:
                message += f"\n\nПричина: {reason}"
            
            await self._create_notification(
                user_id=author_id,
                type=NotificationType.ITEM_REJECTED,
                title="Ваш гайд отклонён",
                message=message,
                link=None,  # No link since item is deleted
            )
        
        await self.db.delete(guide)
        await self.db.flush()
        
        return {"id": guide_id_saved, "deleted": True}
    
    async def update_incident_status(
        self,
        incident_id: int,
        status: str,
    ) -> Optional[Incident]:
        """Обновить статус публикации инцидента."""
        incident = await self.db.get(Incident, incident_id)
        if not incident:
            return None
        
        try:
            incident.publish_status = IncidentPublishStatus(status)
        except ValueError:
            raise ValueError(f"Invalid status: {status}")
        
        await self.db.flush()
        return incident
    
    async def update_guide_status(
        self,
        guide_id: int,
        status: str,
    ) -> Optional[Guide]:
        """Обновить статус публикации гайда."""
        guide = await self.db.get(Guide, guide_id)
        if not guide:
            return None
        
        try:
            guide.publish_status = GuidePublishStatus(status)
        except ValueError:
            raise ValueError(f"Invalid status: {status}")
        
        await self.db.flush()
        return guide
    
    async def notify_reviewers_new_item(
        self,
        item_type: str,
        item_title: str,
        item_link: str,
    ):
        """Уведомить всех ревьюверов о новом элементе, ожидающем проверки."""
        # Get all reviewers
        result = await self.db.execute(
            select(User).where(
                User.role.in_([UserRole.REVIEWER, UserRole.ADMIN])
            )
        )
        reviewers = result.scalars().all()
        
        for reviewer in reviewers:
            await self._create_notification(
                user_id=reviewer.id,
                type=NotificationType.NEW_ITEM_PENDING,
                title=f"Новый {item_type} на модерации",
                message=f"'{item_title}' ожидает проверки.",
                link=item_link,
            )
    
    async def _create_notification(
        self,
        user_id: int,
        type: NotificationType,
        title: str,
        message: str,
        link: Optional[str] = None,
    ):
        """Create a notification."""
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link=link,
        )
        self.db.add(notification)
