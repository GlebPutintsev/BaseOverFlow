"""
Векторный поиск с использованием Qdrant
Высокопроизводительная векторная база данных для семантического поиска.
"""
import time
import re
from typing import Optional
from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from sentence_transformers import SentenceTransformer

from app.config import BASE_DIR


# Инициализация модели (загружается только один раз)
_model = None

MODEL_NAME = 'intfloat/multilingual-e5-large'

def get_model() -> SentenceTransformer:
    """Получить или создать embedding модель (singleton). Только из локального кеша."""
    global _model
    if _model is None:
        print("🔄 Loading embedding model from cache...")
        _model = SentenceTransformer(MODEL_NAME, local_files_only=True)
        print("✅ Embedding model loaded (multilingual-e5-large)!")
    return _model


# Инициализация Qdrant клиента
_qdrant_client = None

# Путь для хранения данных Qdrant (из переменной окружения или по умолчанию)
import os
QDRANT_PATH = os.getenv("QDRANT_PATH", "/app/data/qdrant")

def get_qdrant_client() -> QdrantClient:
    """Получить или создать Qdrant клиента (singleton, с файловым хранилищем)."""
    global _qdrant_client
    if _qdrant_client is None:
        # Создаём директорию если не существует
        qdrant_dir = Path(QDRANT_PATH)
        qdrant_dir.mkdir(parents=True, exist_ok=True)
        
        # Используем файловое хранилище для персистентности
        _qdrant_client = QdrantClient(path=str(qdrant_dir))
        print(f"✅ Qdrant initialized (persistent: {qdrant_dir})")
    return _qdrant_client


# Имена коллекций
INCIDENTS_COLLECTION = "incidents"
GUIDES_COLLECTION = "guides"

# Размер вектора для multilingual-e5-large
VECTOR_SIZE = 1024


def ensure_collections():
    client = get_qdrant_client()
    
    collections = [name.name for name in client.get_collections().collections]
    
    for collection_name in [INCIDENTS_COLLECTION, GUIDES_COLLECTION]:
        if collection_name not in collections:
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=VECTOR_SIZE,
                    distance=Distance.COSINE,
                ),
            )
            print(f"✅ Created collection: {collection_name}")


try:
    ensure_collections()
except Exception as e:
    print(f"⚠️ Could not initialize Qdrant collections: {e}")


def clean_text(text: str) -> str:
    """Очистить текст для embedding."""
    if not text:
        return ""
    text = re.sub(r'```[\s\S]*?```', ' ', text)  # Блоки кода
    text = re.sub(r'`[^`]+`', ' ', text)  # Инлайн код
    text = re.sub(r'[#*_~]', '', text)  # Маркдаун форматирование
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)  # Ссылки
    text = re.sub(r'\s+', ' ', text)  # Много пробелов
    return text.strip()


def create_document_text(
    title: str,
    description: str = "",
    solution: str = "",
    content: str = "",
    error_message: str = "",
    stack_trace: str = "",
    root_cause: str = "",
    prevention: str = "",
    summary: str = "",
    service_name: str = "",
    tags: list[str] = None,
) -> str:
    """Создать поисковой текст из всех полей документа."""
    parts = []
    
    # Заголовок является наиболее важнен добавил (нужно думать как лучше) несколько раз для веса
    if title:
        parts.append(title)
        parts.append(title)  
    
    if service_name:
        parts.append(f"Сервис: {service_name}")
    
    if summary:
        parts.append(clean_text(summary))
    if description:
        parts.append(clean_text(description))
    
    if error_message:
        parts.append(f"Ошибка: {error_message}")
    if stack_trace:
        # Clean stack trace but keep key parts
        cleaned_trace = clean_text(stack_trace)[:500]  # Limit length
        parts.append(f"Stack trace: {cleaned_trace}")
    
    if root_cause:
        parts.append(f"Причина: {clean_text(root_cause)}")
    
    # Solution - very important
    if solution:
        parts.append(f"Решение: {clean_text(solution)}")
    
    # Prevention tips
    if prevention:
        parts.append(f"Предотвращение: {clean_text(prevention)}")
    
    # Full content for guides
    if content:
        parts.append(clean_text(content))
    
    # Tags
    if tags:
        parts.append(f"Теги: {' '.join(tags)}")
    
    return " ".join(parts)


class VectorSearchService:
    def __init__(self):
        self.model = get_model()
        self.client = get_qdrant_client()
    
    def _get_embedding(self, text: str, is_query: bool = False) -> list[float]:
        """
        Генерируем embedding для текста.
        E5 модели требуют конкретных префиксов:
        - 'query: ' для поисковых запросов
        - 'passage: ' для документов
        """
        if is_query:
            text = f"query: {text}"
        else:
            text = f"passage: {text}"
        return self.model.encode(text, normalize_embeddings=True).tolist()
    
    def index_incident(
        self,
        incident_id: int,
        title: str,
        description: str,
        solution: str,
        error_message: str = "",
        stack_trace: str = "",
        root_cause: str = "",
        prevention: str = "",
        service_name: str = "",
        tags: list[str] = None,
    ):
        """Индексируем инцидент для векторного поиска."""
        doc_text = create_document_text(
            title=title,
            description=description,
            solution=solution,
            error_message=error_message,
            stack_trace=stack_trace,
            root_cause=root_cause,
            prevention=prevention,
            service_name=service_name,
            tags=tags,
        )
        
        # Generate embedding
        embedding = self._get_embedding(doc_text)
        
        # Upsert to Qdrant
        self.client.upsert(
            collection_name=INCIDENTS_COLLECTION,
            points=[
                PointStruct(
                    id=incident_id,
                    vector=embedding,
                    payload={
                        "id": incident_id,
                        "title": title,
                        "service": service_name,
                        "type": "incident",
                        "text_preview": doc_text[:500],
                    },
                )
            ],
        )
    
    def index_guide(
        self,
        guide_id: int,
        title: str,
        content: str,
        summary: str = "",
        service_name: str = "",
        tags: list[str] = None,
    ):
        """Индексируем гайд для векторного поиска."""
        doc_text = create_document_text(
            title=title,
            summary=summary,
            content=content,
            service_name=service_name,
            tags=tags,
        )
        
        # Generate embedding
        embedding = self._get_embedding(doc_text)
        
        # Upsert to Qdrant
        self.client.upsert(
            collection_name=GUIDES_COLLECTION,
            points=[
                PointStruct(
                    id=guide_id,
                    vector=embedding,
                    payload={
                        "id": guide_id,
                        "title": title,
                        "service": service_name,
                        "type": "guide",
                        "text_preview": doc_text[:500],
                    },
                )
            ],
        )
    
    def delete_incident(self, incident_id: int):
        """Удаляем инцидент из индекса."""
        try:
            self.client.delete(
                collection_name=INCIDENTS_COLLECTION,
                points_selector=[incident_id],
            )
        except:
            pass
    
    def delete_guide(self, guide_id: int):
        """Удаляем гайд из индекса."""
        try:
            self.client.delete(
                collection_name=GUIDES_COLLECTION,
                points_selector=[guide_id],
            )
        except:
            pass
    
    def search(
        self,
        query: str,
        limit: int = 20,
        type_filter: Optional[str] = None,  
        service_filter: Optional[str] = None,
        min_score: float = 0.80,  # точность поиска 
    ) -> dict:
        """
        Выполняем семантический поиск по инцидентам и гайдам.
        Qdrant возвращает оценки в диапазоне 0-1 для косинусной схожести.
        """
        if not query.strip():
            return {"query": query, "results": [], "total": 0, "took_ms": 0}
        
        start_time = time.time()
        
        # Генерируем embedding для запроса
        query_embedding = self._get_embedding(query, is_query=True)
        
        results = []
        
        search_filter = None
        if service_filter:
            search_filter = Filter(
                must=[
                    FieldCondition(
                        key="service",
                        match=MatchValue(value=service_filter),
                    )
                ]
            )
        
        if type_filter is None or type_filter == "incident":
            try:
                incident_results = self.client.query_points(
                    collection_name=INCIDENTS_COLLECTION,
                    query=query_embedding,
                    query_filter=search_filter,
                    limit=min(limit, 50),
                    score_threshold=min_score,
                )
                
                for hit in incident_results.points:
                    results.append({
                        "id": hit.payload["id"],
                        "type": "incident",
                        "title": hit.payload["title"],
                        "service": hit.payload.get("service", ""),
                        "excerpt": hit.payload.get("text_preview", "")[:200],
                        "score": hit.score,
                    })
            except Exception as e:
                print(f"Incident search error: {e}")
        
        if type_filter is None or type_filter == "guide":
            try:
                guide_results = self.client.query_points(
                    collection_name=GUIDES_COLLECTION,
                    query=query_embedding,
                    query_filter=search_filter,
                    limit=min(limit, 50),
                    score_threshold=min_score,
                )
                
                for hit in guide_results.points:
                    results.append({
                        "id": hit.payload["id"],
                        "type": "guide",
                        "title": hit.payload["title"],
                        "service": hit.payload.get("service", ""),
                        "excerpt": hit.payload.get("text_preview", "")[:200],
                        "score": hit.score,
                    })
            except Exception as e:
                print(f"Guide search error: {e}")
        
        results.sort(key=lambda x: x['score'], reverse=True)
        results = results[:limit]
        
        elapsed = (time.time() - start_time) * 1000
        
        return {
            "query": query,
            "results": results,
            "total": len(results),
            "took_ms": round(elapsed, 2),
        }
    
    def reindex_all(self, incidents: list, guides: list):
        """Реиндексируем все документы. Используется для начальной настройки или перестроения индекса."""
        print("🔄 Reindexing all documents with Qdrant...")
        
        try:
            self.client.delete_collection(INCIDENTS_COLLECTION)
            self.client.delete_collection(GUIDES_COLLECTION)
        except:
            pass
        
        ensure_collections()
        
        # Индексируем инциденты с всеми полями
        for inc in incidents:
            tags = [t.name for t in inc.tags] if hasattr(inc, 'tags') and inc.tags else []
            service_name = inc.service.name if hasattr(inc, 'service') and inc.service else ""
            
            self.index_incident(
                incident_id=inc.id,
                title=inc.title,
                description=inc.description or "",
                solution=inc.solution or "",
                error_message=inc.error_message or "",
                stack_trace=inc.stack_trace or "",
                root_cause=inc.root_cause or "",
                prevention=inc.prevention or "",
                service_name=service_name,
                tags=tags,
            )
        
        print(f"  ✅ Indexed {len(incidents)} incidents")
        
        # Index guides
        for guide in guides:
            tags = [t.name for t in guide.tags] if hasattr(guide, 'tags') and guide.tags else []
            service_name = guide.service.name if hasattr(guide, 'service') and guide.service else ""
            
            self.index_guide(
                guide_id=guide.id,
                title=guide.title,
                content=guide.content or "",
                summary=guide.summary or "",
                service_name=service_name,
                tags=tags,
            )
        
        print(f"  ✅ Indexed {len(guides)} guides")
        print("✅ Reindex complete!")


# Singleton instance
_vector_search_service = None


def get_vector_search_service() -> VectorSearchService:
    """Получить singleton instance of VectorSearchService."""
    global _vector_search_service
    if _vector_search_service is None:
        _vector_search_service = VectorSearchService()
    return _vector_search_service


def needs_reindex() -> bool:
    """Проверить, нужен ли реиндекс (коллекции пустые или не существуют)."""
    try:
        client = get_qdrant_client()
        collections = [c.name for c in client.get_collections().collections]
        
        if INCIDENTS_COLLECTION not in collections or GUIDES_COLLECTION not in collections:
            return True
        
        # Проверяем есть ли данные в коллекциях
        incidents_info = client.get_collection(INCIDENTS_COLLECTION)
        guides_info = client.get_collection(GUIDES_COLLECTION)
        
        if incidents_info.points_count == 0 and guides_info.points_count == 0:
            return True
        
        print(f"✅ Qdrant already has data: {incidents_info.points_count} incidents, {guides_info.points_count} guides")
        return False
    except Exception as e:
        print(f"⚠️ Error checking Qdrant: {e}")
        return True
