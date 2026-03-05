from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import ResponseValidationError

from fastapi.staticfiles import StaticFiles

from app.config import settings, UPLOAD_DIR
from app.database import init_db, async_session_maker
from app.api.routes import api_router
from app.services import IncidentService, GuideService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизненный цикл приложения - старт и выключение."""
    # Startup
    await init_db()
    
    # Создаём дефолтного админа, если его нет
    try:
        from app.services.auth_service import AuthService
        from app.models.user import UserRole
        
        async with async_session_maker() as db:
            auth_service = AuthService(db)
            existing_admin = await auth_service.get_user_by_username("admin")
            if not existing_admin:
                await auth_service.create_user(
                    email="admin@baseoverflow.local",
                    username="admin",
                    password=settings.ADMIN_PASSWORD,
                    display_name="Администратор",
                    role=UserRole.ADMIN,
                )
                await db.commit()
                print("👤 Default admin user created (admin / ***)")
            else:
                changed = False
                if not existing_admin.is_active:
                    existing_admin.is_active = True
                    changed = True
                if existing_admin.role != UserRole.ADMIN:
                    existing_admin.role = UserRole.ADMIN
                    changed = True
                if changed:
                    await db.commit()
                    print("👤 Admin user fixed (role/active)")
                else:
                    print("👤 Admin user already exists")
    except Exception as e:
        print(f"⚠️ Admin user creation failed: {e}")
    
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

# Serve uploaded files at /api/uploads/{filename}
# MUST be mounted BEFORE api_router, otherwise /api prefix catches all requests
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

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
