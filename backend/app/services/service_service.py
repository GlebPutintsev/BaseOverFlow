from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from slugify import slugify
from app.models import Service, Incident, Guide
from app.schemas import ServiceCreate, ServiceUpdate


class ServiceService:
    """Сервис для операций с сервисами/категориями с иерархическими папками."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_all(self) -> list[Service]:
        """Получить все сервисы с отношениями."""
        result = await self.db.execute(
            select(Service)
            .options(
                selectinload(Service.incidents),
                selectinload(Service.guides),
                selectinload(Service.children),
            )
            .order_by(Service.name)
        )
        return list(result.scalars().all())
    
    async def get_root_services(self) -> list[Service]:
        """Get only parentless root-level services."""
        result = await self.db.execute(
            select(Service)
            .options(
                selectinload(Service.incidents),
                selectinload(Service.guides),
                selectinload(Service.children),
            )
            .where(Service.parent_id.is_(None))
            .order_by(Service.name)
        )
        return list(result.scalars().all())
    
    async def get_all_with_counts(self) -> list:
        """Получить все сервисы с количеством инцидентов и гайдов в виде плоского списка."""
        incident_count = (
            select(func.count(Incident.id))
            .where(Incident.service_id == Service.id)
            .correlate(Service)
            .scalar_subquery()
        )
        guide_count = (
            select(func.count(Guide.id))
            .where(Guide.service_id == Service.id)
            .correlate(Service)
            .scalar_subquery()
        )
        
        result = await self.db.execute(
            select(Service, incident_count.label("incidents_count"), guide_count.label("guides_count"))
            .order_by(Service.parent_id.nullsfirst(), Service.name)
        )
        
        services = []
        for row in result.all():
            service = row[0]
            from types import SimpleNamespace
            service_data = SimpleNamespace(
                id=service.id,
                name=service.name,
                slug=service.slug,
                description=service.description,
                icon=service.icon,
                color=service.color,
                parent_id=service.parent_id,
                created_at=service.created_at,
                updated_at=service.updated_at,
                incidents_count=row[1] or 0,
                guides_count=row[2] or 0,
            )
            services.append(service_data)
        
        return services
    
    async def get_tree_with_counts(self) -> list:
        """Получить иерархическое дерево сервисов с количеством."""
        flat_services = await self.get_all_with_counts()
        
        services_by_id = {s.id: s for s in flat_services}
        
        for s in flat_services:
            s.children = []
        
        root_services = []
        for s in flat_services:
            if s.parent_id is None:
                root_services.append(s)
            elif s.parent_id in services_by_id:
                services_by_id[s.parent_id].children.append(s)
        
        return root_services
    
    async def get_flat_with_depth(self) -> list:
        """Получить плоский список сервисов с уровнем вложенности для выпадающих списков."""
        flat_services = await self.get_all_with_counts()
        
        services_by_id = {s.id: s for s in flat_services}
        
        def get_depth(svc):
            depth = 0
            current = svc
            while current.parent_id is not None:
                depth += 1
                if current.parent_id in services_by_id:
                    current = services_by_id[current.parent_id]
                else:
                    break
            return depth
        
        for s in flat_services:
            s.depth = get_depth(s)
        
        def sort_key(s):
            # Build path for proper sorting
            path = []
            current = s
            while current:
                path.insert(0, current.name)
                if current.parent_id and current.parent_id in services_by_id:
                    current = services_by_id[current.parent_id]
                else:
                    break
            return path
        
        flat_services.sort(key=sort_key)
        return flat_services
    
    async def get_by_id(self, service_id: int) -> Service | None:
        result = await self.db.execute(
            select(Service)
            .options(selectinload(Service.incidents), selectinload(Service.guides))
            .where(Service.id == service_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_slug(self, slug: str) -> Service | None:
        result = await self.db.execute(
            select(Service)
            .options(selectinload(Service.incidents), selectinload(Service.guides))
            .where(Service.slug == slug)
        )
        return result.scalar_one_or_none()
    
    async def create(self, data: ServiceCreate) -> Service:
        """Создать новый сервис."""
        slug = slugify(data.name)
        
        # Ensure unique slug
        existing = await self.get_by_slug(slug)
        if existing:
            slug = f"{slug}-{await self._get_next_slug_suffix(slug)}"
        
        service = Service(**data.model_dump(), slug=slug)
        self.db.add(service)
        await self.db.flush()
        return service
    
    async def update(self, service_id: int, data: ServiceUpdate) -> Service | None:
        """Update a service."""
        service = await self.get_by_id(service_id)
        if not service:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        
        # Обновить slug, если название изменилось
        if "name" in update_data:
            new_slug = slugify(update_data["name"])
            if new_slug != service.slug:
                existing = await self.get_by_slug(new_slug)
                if existing and existing.id != service_id:
                    new_slug = f"{new_slug}-{await self._get_next_slug_suffix(new_slug)}"
                update_data["slug"] = new_slug
        
        for key, value in update_data.items():
            setattr(service, key, value)
        
        await self.db.flush()
        return service
    
    async def delete(self, service_id: int) -> bool:
        """Удалить сервис."""
        service = await self.get_by_id(service_id)
        if service:
            await self.db.delete(service)
            return True
        return False
    
    async def _get_next_slug_suffix(self, base_slug: str) -> int:
        """Получить следующий доступный суффикс slug."""
        result = await self.db.execute(
            select(func.count())
            .select_from(Service)
            .where(Service.slug.like(f"{base_slug}%"))
        )
        return result.scalar() + 1

