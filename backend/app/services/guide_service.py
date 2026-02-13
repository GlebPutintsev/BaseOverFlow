from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from slugify import slugify
from app.models import Guide, Tag
from app.models.guide import GuideType
from app.schemas import GuideCreate, GuideUpdate
from app.services.tag_service import TagService

try:
    from app.services.vector_search import get_vector_search_service
    VECTOR_SEARCH_AVAILABLE = True
except ImportError:
    VECTOR_SEARCH_AVAILABLE = False


class GuideService:
    """Сервис для операций с гайдами."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.tag_service = TagService(db)
    
    def _index_guide(self, guide: Guide):
        """Индексировать гайд для векторного поиска."""
        if not VECTOR_SEARCH_AVAILABLE:
            return
        try:
            vector_service = get_vector_search_service()
            tags = [t.name for t in guide.tags] if guide.tags else []
            service_name = guide.service.name if guide.service else ""
            
            vector_service.index_guide(
                guide_id=guide.id,
                title=guide.title,
                content=guide.content or "",
                summary=guide.summary or "",
                service_name=service_name,
                tags=tags,
            )
        except Exception as e:
            print(f"Warning: Failed to index guide: {e}")
    
    async def get_all(
        self,
        service_id: Optional[int] = None,
        guide_type: Optional[GuideType] = None,
        tag_ids: Optional[list[int]] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Guide], int]:
        """Получить гайды с фильтрами и пагинацией."""
        query = (
            select(Guide)
            .options(selectinload(Guide.tags), selectinload(Guide.service))
        )
        count_query = select(func.count()).select_from(Guide)
        
        # Применить фильтры
        if service_id:
            query = query.where(Guide.service_id == service_id)
            count_query = count_query.where(Guide.service_id == service_id)
        
        if guide_type:
            query = query.where(Guide.guide_type == guide_type)
            count_query = count_query.where(Guide.guide_type == guide_type)
        
        if tag_ids:
            query = query.join(Guide.tags).where(Tag.id.in_(tag_ids))
            count_query = count_query.join(Guide.tags).where(Tag.id.in_(tag_ids))
        
        # Получить общее количество
        total = await self.db.execute(count_query)
        total_count = total.scalar() or 0
        
        # Применить сортировку (сначала закрепленные, затем по дате) и пагинацию
        query = (
            query
            .order_by(Guide.is_pinned.desc(), Guide.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        
        result = await self.db.execute(query)
        guides = list(result.scalars().unique().all())
        
        return guides, total_count
    
    async def get_by_id(self, guide_id: int) -> Guide | None:
        """Получить гайд по ID."""
        result = await self.db.execute(
            select(Guide)
            .options(selectinload(Guide.tags), selectinload(Guide.service))
            .where(Guide.id == guide_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_slug(self, slug: str) -> Guide | None:
        """Получить гайд по slug."""
        result = await self.db.execute(
            select(Guide)
            .options(selectinload(Guide.tags), selectinload(Guide.service))
            .where(Guide.slug == slug)
        )
        return result.scalar_one_or_none()
    
    async def create(
        self,
        data: GuideCreate,
        author_id: int | None = None,
        author_name: str | None = None,
        publish_status = None,
    ) -> Guide:
        """Создать новый гайд."""
        from app.models.guide import PublishStatus
        
        slug = slugify(data.title)
        
        # Убедиться в уникальности slug
        existing = await self.get_by_slug(slug)
        if existing:
            slug = f"{slug}-{await self._get_next_slug_suffix(slug)}"
        
        # Получить теги
        tags = await self.tag_service.get_by_ids(data.tag_ids)
        
        # Создать гайд
        guide_data = data.model_dump(exclude={"tag_ids"})
        guide = Guide(**guide_data, slug=slug)
        guide.tags = tags
        
        # Set author and publish status
        if author_id:
            guide.author_id = author_id
        if author_name:
            guide.author = author_name
        if publish_status:
            guide.publish_status = publish_status
        
        self.db.add(guide)
        await self.db.flush()
        
        # Reload with relationships
        guide = await self.get_by_id(guide.id)
        
        # Index for vector search (only if published)
        status_value = guide.publish_status.value if hasattr(guide.publish_status, 'value') else str(guide.publish_status)
        if status_value == "published":
            self._index_guide(guide)
        
        return guide
    
    async def update(self, guide_id: int, data: GuideUpdate) -> Guide | None:
        """Update a guide."""
        guide = await self.get_by_id(guide_id)
        if not guide:
            return None
        
        update_data = data.model_dump(exclude_unset=True, exclude={"tag_ids"})
        
        # Update slug if title changed
        if "title" in update_data:
            new_slug = slugify(update_data["title"])
            if new_slug != guide.slug:
                existing = await self.get_by_slug(new_slug)
                if existing and existing.id != guide_id:
                    new_slug = f"{new_slug}-{await self._get_next_slug_suffix(new_slug)}"
                update_data["slug"] = new_slug
        
        for key, value in update_data.items():
            setattr(guide, key, value)
        
        # Update tags if provided
        if data.tag_ids is not None:
            guide.tags = await self.tag_service.get_by_ids(data.tag_ids)
        
        await self.db.flush()
        
        # Reload with relationships for proper serialization
        guide = await self.get_by_id(guide_id)
        
        # Re-index for vector search
        self._index_guide(guide)
        
        return guide
    
    async def delete(self, guide_id: int) -> bool:
        """Delete a guide."""
        guide = await self.get_by_id(guide_id)
        if guide:
            # Remove from vector index
            if VECTOR_SEARCH_AVAILABLE:
                try:
                    vector_service = get_vector_search_service()
                    vector_service.delete_guide(guide_id)
                except:
                    pass
            
            await self.db.delete(guide)
            return True
        return False
    
    async def increment_views(self, guide_id: int) -> None:
        """Increment view counter."""
        guide = await self.get_by_id(guide_id)
        if guide:
            guide.views += 1
            await self.db.flush()
    
    async def get_pinned(self, service_id: Optional[int] = None) -> list[Guide]:
        """Get pinned guides."""
        query = (
            select(Guide)
            .options(selectinload(Guide.tags), selectinload(Guide.service))
            .where(Guide.is_pinned == True)
            .order_by(Guide.created_at.desc())
        )
        if service_id:
            query = query.where(Guide.service_id == service_id)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_top_rated(self, limit: int = 10) -> list[Guide]:
        """Get top rated guides by score."""
        result = await self.db.execute(
            select(Guide)
            .options(selectinload(Guide.tags), selectinload(Guide.service))
            .where(Guide.score > 0)
            .order_by(Guide.score.desc(), Guide.views.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_recent(self, limit: int = 10) -> list[Guide]:
        """Get recent guides."""
        result = await self.db.execute(
            select(Guide)
            .options(selectinload(Guide.tags), selectinload(Guide.service))
            .order_by(Guide.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def _get_next_slug_suffix(self, base_slug: str) -> int:
        """Get next available slug suffix."""
        result = await self.db.execute(
            select(func.count())
            .select_from(Guide)
            .where(Guide.slug.like(f"{base_slug}%"))
        )
        return result.scalar() + 1
