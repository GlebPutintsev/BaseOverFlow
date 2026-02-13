"""
Скрипт для реиндексации всех документов для векторного поиска.
"""
import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import init_db, async_session_maker
from app.models import Incident, Guide
from app.services.vector_search import get_vector_search_service


async def reindex_all():
    """Реиндексация всех инцидентов и гайдов."""
    print("🚀 Starting reindex...")
    
    await init_db()
    
    vector_service = get_vector_search_service()
    
    async with async_session_maker() as db:
        result = await db.execute(
            select(Incident)
            .options(selectinload(Incident.tags), selectinload(Incident.service))
        )
        incidents = result.scalars().all()
        print(f"📋 Found {len(incidents)} incidents")
        
        result = await db.execute(
            select(Guide)
            .options(selectinload(Guide.tags), selectinload(Guide.service))
        )
        guides = result.scalars().all()
        print(f"📋 Found {len(guides)} guides")
        
        vector_service.reindex_all(incidents, guides)
    
    print("\n🎉 Reindex complete!")
    print("Vector search is now ready to use.")


if __name__ == "__main__":
    asyncio.run(reindex_all())

