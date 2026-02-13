from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel
from app.schemas.tag import TagResponse


class SearchResult(BaseModel):
    id: int
    type: Literal["incident", "guide"]
    title: str
    slug: str
    excerpt: str  # выделенный текст
    service_id: int
    service_name: str
    service_slug: str
    tags: list[TagResponse] = []
    created_at: datetime
    score: float


class SearchResponse(BaseModel):
    """Ответ поиска с результатами и метаданными"""
    query: str
    total: int
    results: list[SearchResult]
    took_ms: float  # Search time in milliseconds


class Suggestion(BaseModel):
    id: int
    type: Literal["incident", "guide"]
    title: str
    slug: str
    service_name: str
    score: float  # Fuzzy match score (0-100)


class SuggestionsResponse(BaseModel):
    """Ответ для автокомплита"""
    query: str
    suggestions: list[Suggestion]
    corrected_query: Optional[str] = None  # если была допущена ошибка
    took_ms: float

