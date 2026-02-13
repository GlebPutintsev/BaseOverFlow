from typing import Optional
from fastapi import APIRouter, Query
from app.api.deps import SearchServiceDep
from app.schemas.search import SearchResponse, SuggestionsResponse

router = APIRouter()


@router.get("", response_model=SearchResponse)
async def search(
    search_service: SearchServiceDep,
    q: str = Query(..., min_length=1, description="Search query"),
    service_id: Optional[str] = Query(None, description="Filter by service ID"),
    type: Optional[str] = Query(None, description="Filter by type: incident or guide"),
    limit: int = Query(20, ge=1, le=50),
):
    """
    семантический поиск по инцидентам и гайдам.
    
    - поисковый запрос (обязательно)
    - фильтр по сервису (опционально)
    - фильтр по типу - "incident" или "guide" (опционально)
    - максимальное количество результатов (по умолчанию: 20)
    """
    service_id_int = None
    if service_id and service_id.strip():
        try:
            service_id_int = int(service_id)
        except ValueError:
            pass
    
    type_filter = type if type and type.strip() else None
    
    return await search_service.search(
        query=q,
        service_id=service_id_int,
        type_filter=type_filter,
        limit=limit,
    )


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    search_service: SearchServiceDep,
    q: str = Query(..., min_length=1, description="Search query for autocomplete"),
    limit: int = Query(8, ge=1, le=15),
):
    return await search_service.get_suggestions(query=q, limit=limit)
