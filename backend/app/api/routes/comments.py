"""API routes для комментариев."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.services.comment_service import CommentService
from app.api.routes.auth import get_current_user, get_current_user_optional
from app.schemas.comment import (
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    CommentsListResponse,
    CommentVoteRequest,
)

router = APIRouter(prefix="/comments", tags=["comments"])


@router.get("/incident/{incident_id}", response_model=CommentsListResponse)
async def get_incident_comments(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    service = CommentService(db)
    user_id = current_user.id if current_user else None
    comments = await service.get_comments_for_incident(incident_id, user_id)
    return CommentsListResponse(comments=comments, total=len(comments))


@router.get("/guide/{guide_id}", response_model=CommentsListResponse)
async def get_guide_comments(
    guide_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    service = CommentService(db)
    user_id = current_user.id if current_user else None
    comments = await service.get_comments_for_guide(guide_id, user_id)
    return CommentsListResponse(comments=comments, total=len(comments))


@router.post("/", response_model=CommentResponse)
async def create_comment(
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Создать новый комментарий. Требует авторизации."""
    if not data.incident_id and not data.guide_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either incident_id or guide_id must be provided",
        )
    
    service = CommentService(db)
    comment = await service.create(data, current_user)
    
    return CommentResponse(
        id=comment.id,
        content=comment.content,
        author_id=comment.author_id,
        author_name=comment.author_name,
        author_username=current_user.username,
        author_display_name=current_user.display_name or current_user.username,
        incident_id=comment.incident_id,
        guide_id=comment.guide_id,
        parent_id=comment.parent_id,
        score=comment.score,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        is_top_answer=False,
        replies=[],
        user_vote=None,
    )


@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    data: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Обновить комментарий. Только автор может редактировать."""
    service = CommentService(db)
    comment = await service.get_by_id(comment_id)
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )
    
    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author can edit this comment",
        )
    
    updated = await service.update(comment, data)
    
    return CommentResponse(
        id=updated.id,
        content=updated.content,
        author_id=updated.author_id,
        author_name=updated.author_name,
        author_username=updated.author_username,
        author_display_name=updated.author_display_name,
        incident_id=updated.incident_id,
        guide_id=updated.guide_id,
        parent_id=updated.parent_id,
        score=updated.score,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        is_top_answer=False,
        replies=[],
        user_vote=None,
    )


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Удалить комментарий. Автор или модератор может удалить."""
    service = CommentService(db)
    comment = await service.get_by_id(comment_id)
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )
    
    is_moderator = current_user.role in [UserRole.ADMIN, UserRole.REVIEWER]
    if comment.author_id != current_user.id and not is_moderator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author or moderators can delete this comment",
        )
    
    await service.delete(comment)
    return {"deleted": True}


@router.post("/{comment_id}/vote")
async def vote_comment(
    comment_id: int,
    data: CommentVoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Голосовать на комментарии. Требует авторизации. На свой голосовать нельзя"""
    service = CommentService(db)
    comment = await service.get_by_id(comment_id)
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found",
        )
    
    if comment.author_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot vote on your own comment",
        )
    
    result = await service.vote(comment_id, current_user.id, data.vote_type)
    return result
