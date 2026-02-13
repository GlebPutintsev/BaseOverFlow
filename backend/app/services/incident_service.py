from typing import Optional
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from slugify import slugify
from app.models import Incident, Tag
from app.models.incident import Severity, Status, PublishStatus
from app.schemas import IncidentCreate, IncidentUpdate
from app.services.tag_service import TagService

try:
    from app.services.vector_search import get_vector_search_service
    VECTOR_SEARCH_AVAILABLE = True
except ImportError:
    VECTOR_SEARCH_AVAILABLE = False


class IncidentService:
    """Сервис для операций с инцидентами."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.tag_service = TagService(db)
    
    def _index_incident(self, incident: Incident):
        """Индексировать инцидент для векторного поиска с всеми полями."""
        if not VECTOR_SEARCH_AVAILABLE:
            return
        try:
            vector_service = get_vector_search_service()
            tags = [t.name for t in incident.tags] if incident.tags else []
            service_name = incident.service.name if incident.service else ""
            
            vector_service.index_incident(
                incident_id=incident.id,
                title=incident.title,
                description=incident.description or "",
                solution=incident.solution or "",
                error_message=incident.error_message or "",
                stack_trace=incident.stack_trace or "",
                root_cause=incident.root_cause or "",
                prevention=incident.prevention or "",
                service_name=service_name,
                tags=tags,
            )
        except Exception as e:
            print(f"Warning: Failed to index incident: {e}")
    
    async def get_all(
        self,
        service_id: Optional[int] = None,
        severity: Optional[Severity] = None,
        status: Optional[Status] = None,
        tag_ids: Optional[list[int]] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Incident], int]:
        """Получить инциденты с фильтрами и пагинацией."""
        query = (
            select(Incident)
            .options(selectinload(Incident.tags), selectinload(Incident.service))
        )
        count_query = select(func.count()).select_from(Incident)
        
        # Применить фильтры
        if service_id:
            query = query.where(Incident.service_id == service_id)
            count_query = count_query.where(Incident.service_id == service_id)
        
        if severity:
            query = query.where(Incident.severity == severity)
            count_query = count_query.where(Incident.severity == severity)
        
        if status:
            query = query.where(Incident.status == status)
            count_query = count_query.where(Incident.status == status)
        
        if tag_ids:
            query = query.join(Incident.tags).where(Tag.id.in_(tag_ids))
            count_query = count_query.join(Incident.tags).where(Tag.id.in_(tag_ids))
        
        # Получить общее количество
        total = await self.db.execute(count_query)
        total_count = total.scalar() or 0
        
        # Применить сортировку (сначала закрепленные, затем по дате) и пагинацию
        query = (
            query
            .order_by(Incident.is_pinned.desc(), Incident.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        
        result = await self.db.execute(query)
        incidents = list(result.scalars().unique().all())
        
        return incidents, total_count
    
    async def get_by_id(self, incident_id: int) -> Incident | None:
        """Получить инцидент по ID."""
        result = await self.db.execute(
            select(Incident)
            .options(selectinload(Incident.tags), selectinload(Incident.service))
            .where(Incident.id == incident_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_slug(self, slug: str) -> Incident | None:
        """Получить инцидент по slug."""
        result = await self.db.execute(
            select(Incident)
            .options(selectinload(Incident.tags), selectinload(Incident.service))
            .where(Incident.slug == slug)
        )
        return result.scalar_one_or_none()
    
    async def create(
        self,
        data: IncidentCreate,
        author_id: int | None = None,
        author_name: str | None = None,
        publish_status = None,
    ) -> Incident:
        """Создать новый инцидент."""
        from app.models.incident import PublishStatus
        
        slug = slugify(data.title)
        
        # Убедиться в уникальности slug
        existing = await self.get_by_slug(slug)
        if existing:
            slug = f"{slug}-{await self._get_next_slug_suffix(slug)}"
        
        # Получить теги
        tags = await self.tag_service.get_by_ids(data.tag_ids)
        
        # Создать инцидент
        incident_data = data.model_dump(exclude={"tag_ids"})
        incident = Incident(**incident_data, slug=slug)
        incident.tags = tags
        
        # Установить автора и статус публикации
        if author_id:
            incident.author_id = author_id
        if author_name:
            incident.author = author_name
        if publish_status:
            incident.publish_status = publish_status
        
        self.db.add(incident)
        await self.db.flush()
        
        incident = await self.get_by_id(incident.id)
        
        # Индексировать для векторного поиска (только если опубликован)
        status_value = incident.publish_status.value if hasattr(incident.publish_status, 'value') else str(incident.publish_status)
        if status_value == "published":
            self._index_incident(incident)
        
        return incident
    
    async def update(self, incident_id: int, data: IncidentUpdate) -> Incident | None:
        """Обновить инцидент."""
        incident = await self.get_by_id(incident_id)
        if not incident:
            return None
        
        update_data = data.model_dump(exclude_unset=True, exclude={"tag_ids"})
        
        # Обновить slug, если title изменился
        if "title" in update_data:
            new_slug = slugify(update_data["title"])
            if new_slug != incident.slug:
                existing = await self.get_by_slug(new_slug)
                if existing and existing.id != incident_id:
                    new_slug = f"{new_slug}-{await self._get_next_slug_suffix(new_slug)}"
                update_data["slug"] = new_slug
        
        for key, value in update_data.items():
            setattr(incident, key, value)
        
        # Обновить теги, если они предоставлены
        if data.tag_ids is not None:
            incident.tags = await self.tag_service.get_by_ids(data.tag_ids)
        
        await self.db.flush()
        
        # Перезагрузить с отношениями для правильной сериализации
        incident = await self.get_by_id(incident_id)
        
        # Переиндексировать для векторного поиска
        self._index_incident(incident)
        
        return incident
    
    async def delete(self, incident_id: int) -> bool:
        """Удалить инцидент."""
        incident = await self.get_by_id(incident_id)
        if incident:
            # Удалить из векторного индекса
            if VECTOR_SEARCH_AVAILABLE:
                try:
                    vector_service = get_vector_search_service()
                    vector_service.delete_incident(incident_id)
                except:
                    pass
            
            await self.db.delete(incident)
            return True
        return False
    
    async def increment_views(self, incident_id: int) -> None:
        """Увеличить счетчик просмотров."""
        incident = await self.get_by_id(incident_id)
        if incident:
            incident.views += 1
            await self.db.flush()
    
    async def get_recent(self, limit: int = 10) -> list[Incident]:
        """Получить последние инциденты."""
        result = await self.db.execute(
            select(Incident)
            .options(selectinload(Incident.tags), selectinload(Incident.service))
            .order_by(Incident.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_popular(self, limit: int = 10) -> list[Incident]:
        """Получить популярные инциденты по просмотрам."""
        result = await self.db.execute(
            select(Incident)
            .options(selectinload(Incident.tags), selectinload(Incident.service))
            .order_by(Incident.views.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_top_rated(self, limit: int = 10) -> list[Incident]:
        """Получить лучшие инциденты по score."""
        result = await self.db.execute(
            select(Incident)
            .options(selectinload(Incident.tags), selectinload(Incident.service))
            .where(Incident.score > 0)
            .order_by(Incident.score.desc(), Incident.views.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_pinned(self, service_id: Optional[int] = None) -> list[Incident]:
        """Получить закрепленные инциденты."""
        query = (
            select(Incident)
            .options(selectinload(Incident.tags), selectinload(Incident.service))
            .where(Incident.is_pinned == True)
            .order_by(Incident.created_at.desc())
        )
        
        if service_id:
            query = query.where(Incident.service_id == service_id)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def _get_next_slug_suffix(self, base_slug: str) -> int:
        """Получить следующий доступный суффикс slug."""
        result = await self.db.execute(
            select(func.count())
            .select_from(Incident)
            .where(Incident.slug.like(f"{base_slug}%"))
        )
        return result.scalar() + 1

