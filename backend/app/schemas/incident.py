from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.incident import Severity, Status, PublishStatus
from app.schemas.tag import TagResponse
from app.schemas.service import ServiceResponse


class IncidentBase(BaseModel):
    """Базовая схема для инцидента"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    root_cause: Optional[str] = None
    solution: str = Field(..., min_length=1)
    prevention: Optional[str] = None
    severity: Severity = Severity.MEDIUM
    status: Status = Status.RESOLVED
    author: Optional[str] = Field(None, max_length=100)
    incident_date: Optional[datetime] = None
    is_pinned: bool = False
    image_url: Optional[str] = None
    image_position: Optional[str] = "50 50"


class IncidentCreate(IncidentBase):
    """Схема йдля создания инцидента"""
    service_id: int
    tag_ids: list[int] = Field(default_factory=list)


class IncidentUpdate(BaseModel):
    """Схема для обновления инцидента"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    root_cause: Optional[str] = None
    solution: Optional[str] = None
    prevention: Optional[str] = None
    severity: Optional[Severity] = None
    status: Optional[Status] = None
    author: Optional[str] = Field(None, max_length=100)
    incident_date: Optional[datetime] = None
    service_id: Optional[int] = None
    tag_ids: Optional[list[int]] = None
    is_pinned: Optional[bool] = None
    image_url: Optional[str] = None
    image_position: Optional[str] = None


class IncidentResponse(IncidentBase):
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


class IncidentList(BaseModel):
    id: int
    title: str
    slug: str
    severity: Severity
    status: Status
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

