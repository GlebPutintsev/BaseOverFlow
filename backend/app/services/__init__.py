from app.services.service_service import ServiceService
from app.services.incident_service import IncidentService
from app.services.guide_service import GuideService
from app.services.tag_service import TagService
from app.services.search_service import SearchService

# векторный поиск (опционально, требует chromadb и sentence-transformers)
try:
    from app.services.vector_search import VectorSearchService, get_vector_search_service
    VECTOR_SEARCH_AVAILABLE = True
except ImportError:
    VectorSearchService = None
    get_vector_search_service = None
    VECTOR_SEARCH_AVAILABLE = False

__all__ = [
    "ServiceService",
    "IncidentService",
    "GuideService",
    "TagService",
    "SearchService",
    "VectorSearchService",
    "get_vector_search_service",
    "VECTOR_SEARCH_AVAILABLE",
]

