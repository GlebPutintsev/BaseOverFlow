from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.guide import GuideType, PublishStatus
from app.schemas.tag import TagResponse
from app.schemas.service import ServiceResponse


class GuideBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    summary: Optional[str] = None
    content: str = Field(..., min_length=1)
    guide_type: GuideType = GuideType.HOWTO
    author: Optional[str] = Field(None, max_length=100)
    is_pinned: bool = False
    image_url: Optional[str] = None
    image_position: Optional[str] = "50 50"


class GuideCreate(GuideBase):
    """Схема для создания гайда"""
    service_id: int
    tag_ids: list[int] = Field(default_factory=list)


class GuideUpdate(BaseModel):
    """Схема для обновления гайда"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    summary: Optional[str] = None
    content: Optional[str] = None
    guide_type: Optional[GuideType] = None
    author: Optional[str] = Field(None, max_length=100)
    is_pinned: Optional[bool] = None
    image_url: Optional[str] = None
    image_position: Optional[str] = None
    service_id: Optional[int] = None
    tag_ids: Optional[list[int]] = None


class GuideResponse(GuideBase):
    id: int
    slug: str
    views: int
    score: int = 0
    publish_status: PublishStatus = PublishStatus.PUBLISHED
    author_id: Optional[int] = None
    author_username: Optional[str] = None
    service_id: int
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = []
    service: Optional[ServiceResponse] = None
    
    class Config:
        from_attributes = True


class GuideList(BaseModel):
    """Схема для списка гайдов"""
    id: int
    title: str
    slug: str
    summary: Optional[str] = None
    guide_type: GuideType
    author: Optional[str] = None
    author_id: Optional[int] = None
    author_username: Optional[str] = None
    views: int
    score: int = 0
    publish_status: PublishStatus = PublishStatus.PUBLISHED
    is_pinned: bool
    image_url: Optional[str] = None
    image_position: Optional[str] = None
    service_id: int
    created_at: datetime
    tags: list[TagResponse] = []
    service: Optional[ServiceResponse] = None
    
    class Config:
        from_attributes = True

