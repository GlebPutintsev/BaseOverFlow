from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ServiceBase(BaseModel):
    """Базовая схема для сервиса"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: str = Field(default="folder", max_length=50)
    color: str = Field(default="#3b82f6", pattern=r"^#[0-9a-fA-F]{6}$")
    parent_id: Optional[int] = None  # NULL = root level


class ServiceCreate(ServiceBase):
    """Схема для создания сервиса/папки"""
    pass


class ServiceUpdate(BaseModel):
    """Схема для обновления сервиса"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    parent_id: Optional[int] = None  # Can move to different parent


class ServiceResponse(ServiceBase):
    id: int
    slug: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ServiceWithStats(ServiceResponse):
    """Сервис с отображением статистики"""
    incidents_count: int = 0
    guides_count: int = 0


class ServiceWithDepth(ServiceWithStats):
    """Service with depth level for hierarchical display."""
    depth: int = 0


class ServiceTree(ServiceResponse):
    """Service with nested children for tree view."""
    incidents_count: int = 0
    guides_count: int = 0
    children: List[ServiceTree] = []
    
    class Config:
        from_attributes = True


# Required for self-referencing
ServiceTree.model_rebuild()

