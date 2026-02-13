from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Tag
from app.schemas import TagCreate


class TagService:
    """Service for tag operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all(self) -> list[Tag]:
        """Get all tags."""
        result = await self.db.execute(select(Tag).order_by(Tag.name))
        return list(result.scalars().all())
    
    async def get_by_id(self, tag_id: int) -> Tag | None:
        """Get tag by ID."""
        result = await self.db.execute(select(Tag).where(Tag.id == tag_id))
        return result.scalar_one_or_none()
    
    async def get_by_name(self, name: str) -> Tag | None:
        """Get tag by name."""
        result = await self.db.execute(select(Tag).where(Tag.name == name))
        return result.scalar_one_or_none()
    
    async def get_by_ids(self, tag_ids: list[int]) -> list[Tag]:
        """Get tags by IDs."""
        if not tag_ids:
            return []
        result = await self.db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        return list(result.scalars().all())
    
    async def create(self, data: TagCreate) -> Tag:
        """Создать новый тег."""
        tag = Tag(**data.model_dump())
        self.db.add(tag)
        await self.db.flush()
        return tag
    
    async def get_or_create(self, name: str, color: str = "#6366f1") -> Tag:
        """Получить существующий тег или создать новый."""
        tag = await self.get_by_name(name)
        if tag:
            return tag
        return await self.create(TagCreate(name=name, color=color))
    
    async def delete(self, tag_id: int) -> bool:
        """Удалить тег."""
        tag = await self.get_by_id(tag_id)
        if tag:
            await self.db.delete(tag)
            return True
        return False

