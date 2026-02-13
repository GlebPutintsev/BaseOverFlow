"""Схемы для комментариев"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    """Схема для создания комментария"""
    content: str = Field(..., min_length=1, max_length=5000)
    incident_id: Optional[int] = None
    guide_id: Optional[int] = None
    parent_id: Optional[int] = None  # For replies


class CommentUpdate(BaseModel):
    """Схема для редактирования комментария"""
    content: str = Field(..., min_length=1, max_length=5000)


class CommentVoteRequest(BaseModel):
    """Схема для голосования на комментарии"""
    vote_type: str = Field(..., pattern="^(upvote|downvote)$")


class CommentAuthor(BaseModel):
    """Минимальная информация о авторе комментария"""
    id: int
    username: str
    display_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    """Схема для ответа"""
    id: int
    content: str
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    author_username: Optional[str] = None
    author_display_name: Optional[str] = None
    incident_id: Optional[int] = None
    guide_id: Optional[int] = None
    parent_id: Optional[int] = None
    score: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_top_answer: bool = False  # выделен как лучший ответ
    replies: List["CommentResponse"] = []
    user_vote: Optional[str] = None  # текущий голос пользователя: "upvote", "downvote", или None
    
    class Config:
        from_attributes = True


# для рекурсивных ответов
CommentResponse.model_rebuild()


class CommentsListResponse(BaseModel):
    comments: List[CommentResponse]
    total: int
