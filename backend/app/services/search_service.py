"""
Семантический векторный поиск.
Использует embeddings для поиска по смыслу с высокой точностью.
"""
import time
import re
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Incident, Guide, Service
from app.schemas.search import SearchResult, SearchResponse, Suggestion, SuggestionsResponse
from app.schemas.tag import TagResponse

try:
    from app.services.vector_search import get_vector_search_service, VectorSearchService
    VECTOR_SEARCH_AVAILABLE = True
except ImportError:
    VECTOR_SEARCH_AVAILABLE = False
    print("⚠️ Vector search not available")

# для толерантности к опечаткам в предложениях
try:
    from rapidfuzz import fuzz, process
    FUZZY_AVAILABLE = True
except ImportError:
    FUZZY_AVAILABLE = False
    print("⚠️ Fuzzy matching not available, install rapidfuzz")


class SearchService:
    """
    Использует embeddings для поиска результатов по смыслу, а не по ключевым словам.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.vector_service = get_vector_search_service() if VECTOR_SEARCH_AVAILABLE else None
    
    async def search(
        self,
        query: str,
        service_id: Optional[int] = None,
        type_filter: Optional[str] = None,
        limit: int = 20,
    ) -> SearchResponse:
        """
        Выполнить семантический векторный поиск по инцидентам и гайдам.
        """
        if not query.strip():
            return SearchResponse(query=query, total=0, results=[], took_ms=0)
        
        if not self.vector_service:
            return SearchResponse(query=query, total=0, results=[], took_ms=0)
        
        start_time = time.time()
        
        # Получить название сервиса для фильтрации
        service_name = None
        if service_id:
            service = await self._get_service(service_id)
            service_name = service.name if service else None
        
        try:
            vector_results = self.vector_service.search(
                query=query,
                limit=limit,
                type_filter=type_filter,
                service_filter=service_name,
            )
        except Exception as e:
            print(f"Vector search error: {e}")
            return SearchResponse(query=query, total=0, results=[], took_ms=0)
        
        # Фильтрация по пороговому значению score
        filtered_results = [
            vr for vr in vector_results.get('results', [])
            if vr['score'] >= 0.80
        ]
        
        # Сортировка по score и ограничение до 5 результатов
        sorted_results = sorted(
            filtered_results,
            key=lambda x: x['score'],
            reverse=True
        )[:min(limit, 5)]
        
        final_results = []
        for result in sorted_results:
            full_data = await self._get_full_result(
                result['id'],
                result['type'],
                query,
                result['score'],
            )
            if full_data:
                final_results.append(full_data)
        
        took_ms = (time.time() - start_time) * 1000
        
        return SearchResponse(
            query=query,
            total=len(final_results),
            results=final_results,
            took_ms=round(took_ms, 2),
        )
    
    async def _get_service(self, service_id: int) -> Optional[Service]:
        """Получить сервис по ID."""
        result = await self.db.execute(
            select(Service).where(Service.id == service_id)
        )
        return result.scalar_one_or_none()
    
    async def _get_full_result(
        self,
        doc_id: int,
        doc_type: str,
        query: str,
        score: float,
    ) -> Optional[SearchResult]:
        """Получить полные данные для результата поиска."""
        if doc_type == "incident":
            result = await self.db.execute(
                select(Incident)
                .options(selectinload(Incident.tags), selectinload(Incident.service))
                .where(Incident.id == doc_id)
            )
            doc = result.scalar_one_or_none()
            if not doc:
                return None
            
            excerpt = self._create_excerpt(
                f"{doc.title} {doc.description} {doc.solution}",
                query.split()
            )
            
            return SearchResult(
                id=doc.id,
                type="incident",
                title=doc.title,
                slug=doc.slug,
                excerpt=excerpt,
                service_id=doc.service_id,
                service_name=doc.service.name if doc.service else "",
                service_slug=doc.service.slug if doc.service else "",
                tags=[TagResponse.model_validate(t) for t in doc.tags],
                created_at=doc.created_at,
                score=score,
            )
        
        elif doc_type == "guide":
            result = await self.db.execute(
                select(Guide)
                .options(selectinload(Guide.tags), selectinload(Guide.service))
                .where(Guide.id == doc_id)
            )
            doc = result.scalar_one_or_none()
            if not doc:
                return None
            
            excerpt = self._create_excerpt(
                f"{doc.title} {doc.summary or ''} {doc.content}",
                query.split()
            )
            
            return SearchResult(
                id=doc.id,
                type="guide",
                title=doc.title,
                slug=doc.slug,
                excerpt=excerpt,
                service_id=doc.service_id,
                service_name=doc.service.name if doc.service else "",
                service_slug=doc.service.slug if doc.service else "",
                tags=[TagResponse.model_validate(t) for t in doc.tags],
                created_at=doc.created_at,
                score=score,
            )
        
        return None
    
    def _create_excerpt(self, text: str, terms: list[str], max_length: int = 200) -> str:
        text = re.sub(r'\s+', ' ', text).strip()
        text = re.sub(r'[#*`]', '', text)
        
        if not terms or not text:
            return text[:max_length] + "..." if len(text) > max_length else text
        
        text_lower = text.lower()
        first_pos = len(text)
        
        for term in terms:
            pos = text_lower.find(term.lower())
            if pos != -1 and pos < first_pos:
                first_pos = pos
        
        start = max(0, first_pos - 50)
        end = min(len(text), start + max_length)
        
        excerpt = text[start:end]
        
        if start > 0:
            excerpt = "..." + excerpt
        if end < len(text):
            excerpt = excerpt + "..."
        
        return excerpt
    
    async def get_suggestions(
        self,
        query: str,
        limit: int = 8,
    ) -> SuggestionsResponse:
        if not query.strip() or len(query) < 2:
            return SuggestionsResponse(
                query=query,
                suggestions=[],
                corrected_query=None,
                took_ms=0,
            )
        
        start_time = time.time()
        
        titles_data = await self._get_all_titles()
        
        if not titles_data:
            return SuggestionsResponse(
                query=query,
                suggestions=[],
                corrected_query=None,
                took_ms=0,
            )
        
        suggestions = []
        corrected_query = None
        
        if FUZZY_AVAILABLE:
            suggestions, corrected_query = self._fuzzy_match_titles(
                query, titles_data, limit
            )
        else:
            suggestions = self._prefix_match_titles(query, titles_data, limit)
        
        took_ms = (time.time() - start_time) * 1000
        
        return SuggestionsResponse(
            query=query,
            suggestions=suggestions,
            corrected_query=corrected_query,
            took_ms=round(took_ms, 2),
        )
    
    async def _get_all_titles(self) -> list[dict]:
        titles = []
        
        result = await self.db.execute(
            select(Incident.id, Incident.title, Incident.slug, Incident.service_id)
            .join(Service, Incident.service_id == Service.id)
            .add_columns(Service.name.label('service_name'))
        )
        for row in result.all():
            titles.append({
                "id": row.id,
                "type": "incident",
                "title": row.title,
                "slug": row.slug,
                "service_name": row.service_name,
            })
        # Fetch guides
        result = await self.db.execute(
            select(Guide.id, Guide.title, Guide.slug, Guide.service_id)
            .join(Service, Guide.service_id == Service.id)
            .add_columns(Service.name.label('service_name'))
        )
        for row in result.all():
            titles.append({
                "id": row.id,
                "type": "guide",
                "title": row.title,
                "slug": row.slug,
                "service_name": row.service_name,
            })
        
        return titles
    
    def _fuzzy_match_titles(
        self,
        query: str,
        titles_data: list[dict],
        limit: int,
    ) -> tuple[list[Suggestion], Optional[str]]:
        query_lower = query.lower()
        scored_results = []
        
        for item in titles_data:
            title = item["title"]
            title_lower = title.lower()
            
            partial_score = fuzz.partial_ratio(query_lower, title_lower)
            token_score = fuzz.token_set_ratio(query_lower, title_lower)
            
            prefix_bonus = 20 if title_lower.startswith(query_lower) else 0
            words = title_lower.split()
            word_start_bonus = 15 if any(w.startswith(query_lower) for w in words) else 0
            
            combined_score = max(partial_score, token_score) + prefix_bonus + word_start_bonus
            
            if combined_score >= 60:
                scored_results.append({
                    **item,
                    "score": min(combined_score, 100),
                })
        
        scored_results.sort(key=lambda x: x["score"], reverse=True)
        top_results = scored_results[:limit]
        
        suggestions = [
            Suggestion(
                id=r["id"],
                type=r["type"],
                title=r["title"],
                slug=r["slug"],
                service_name=r["service_name"],
                score=r["score"],
            )
            for r in top_results
        ]
        
        corrected_query = None
        if suggestions and len(query) >= 3:
            best_match = suggestions[0]
            if 70 <= best_match.score < 95:
                best_title = best_match.title.lower()
                query_words = query_lower.split()
                title_words = best_title.split()
                
                for q_word in query_words:
                    if len(q_word) >= 3:
                        matches = process.extract(
                            q_word, title_words, scorer=fuzz.ratio, limit=1
                        )
                        if matches and matches[0][1] >= 70 and matches[0][1] < 100:
                            corrected_word = matches[0][0]
                            if corrected_word != q_word:
                                corrected_query = query_lower.replace(q_word, corrected_word)
                                break
        
        return suggestions, corrected_query
    
    def _prefix_match_titles(
        self,
        query: str,
        titles_data: list[dict],
        limit: int,
    ) -> list[Suggestion]:
        """Простое сопоставление префиксов, как fallback, когда rapidfuzz не доступен."""
        query_lower = query.lower()
        results = []
        
        for item in titles_data:
            title_lower = item["title"].lower()
            
            if query_lower in title_lower:
                if title_lower.startswith(query_lower):
                    score = 100
                elif any(w.startswith(query_lower) for w in title_lower.split()):
                    score = 90
                else:
                    score = 70
                
                results.append({
                    **item,
                    "score": score,
                })
        
        results.sort(key=lambda x: x["score"], reverse=True)
        
        return [
            Suggestion(
                id=r["id"],
                type=r["type"],
                title=r["title"],
                slug=r["slug"],
                service_name=r["service_name"],
                score=r["score"],
            )
            for r in results[:limit]
        ]
