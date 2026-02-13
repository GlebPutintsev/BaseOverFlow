from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import ResponseValidationError

from app.config import settings
from app.database import init_db, async_session_maker
from app.api.routes import api_router
from app.services import IncidentService, GuideService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизненный цикл приложения - старт и выключение."""
    # Startup
    await init_db()
    
    # Векторный поиск - реиндексация только если данных нет
    try:
        from app.services.vector_search import get_vector_search_service, needs_reindex
        
        if needs_reindex():
            print("🔄 Qdrant needs reindexing...")
            async with async_session_maker() as db:
                incident_svc = IncidentService(db)
                guide_svc = GuideService(db)
                
                incidents, _ = await incident_svc.get_all(limit=10000)
                guides, _ = await guide_svc.get_all(limit=10000)
                
                vector_service = get_vector_search_service()
                vector_service.reindex_all(incidents, guides)
        else:
            # Просто инициализируем сервис без реиндекса
            get_vector_search_service()
    except Exception as e:
        print(f"⚠️ Vector search indexing failed: {e}")
    
    yield
    # Shutdown


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS middleware
cors_origins = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost",       # Docker nginx
    "http://localhost:80",
]
cors_origins.extend(settings.CORS_ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.exception_handler(ResponseValidationError)
async def validation_exception_handler(request: Request, exc: ResponseValidationError):
    print("=" * 50)
    print(f"ResponseValidationError on {request.url}")
    for error in exc.errors():
        print(f"  - {error}")
    print("=" * 50)
    return JSONResponse(
        status_code=500,
        content={"detail": "Response validation error", "errors": exc.errors()},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
