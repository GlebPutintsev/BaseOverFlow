from pydantic_settings import BaseSettings
from pathlib import Path
from typing import List


# Define base directory outside of Settings class
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Настройки приложения."""
    
    # App
    APP_NAME: str = "BaseOverflow"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./baseoverflow.db"
    
    SECRET_KEY: str = "your-super-secret-key-change-in-production-123456789"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    CORS_ORIGINS: List[str] = []
    
    # Default admin
    ADMIN_PASSWORD: str = "admin"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Paths as module-level constants
SEARCH_INDEX_DIR = BASE_DIR / "search_index"
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)