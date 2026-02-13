"""Сервис для CRUD операций и голосования на комментариях."""
from typing import Optional, List
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.comment import Comment, CommentVote, CommentVoteType
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse


class CommentService:
    """Сервис для управления комментариями."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_comments_for_incident(
        self,
        incident_id: int,
        user_id: Optional[int] = None,
    ) -> List[CommentResponse]:
        """Получить все комментарии для инцидента, отсортированные по score."""
        return await self._get_comments(
            incident_id=incident_id,
            user_id=user_id,
        )
    
    async def get_comments_for_guide(
        self,
        guide_id: int,
        user_id: Optional[int] = None,
    ) -> List[CommentResponse]:
        """Получить все комментарии для гайда, отсортированные по score."""
        return await self._get_comments(
            guide_id=guide_id,
            user_id=user_id,
        )
    
    async def _get_comments(
        self,
        incident_id: Optional[int] = None,
        guide_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> List[CommentResponse]:
        """Получить комментарии с вложенными ответами."""
        # Получить только верхние комментарии (parent_id is None)
        query = select(Comment).options(
            selectinload(Comment.author_user),
            selectinload(Comment.replies).options(
                selectinload(Comment.author_user),
                selectinload(Comment.votes),
            ),
            selectinload(Comment.votes),
        ).where(Comment.parent_id.is_(None))
        
        if incident_id:
            query = query.where(Comment.incident_id == incident_id)
        if guide_id:
            query = query.where(Comment.guide_id == guide_id)
        
        # Отсортировать по score (самый высокий первый)
        query = query.order_by(Comment.score.desc(), Comment.created_at.asc())
        
        result = await self.db.execute(query)
        comments = result.scalars().unique().all()
        
        # Получить голоса пользователя, если он авторизован
        user_votes = {}
        if user_id:
            user_votes = await self._get_user_votes(user_id, [c.id for c in comments])
            reply_ids = []
            for c in comments:
                reply_ids.extend([r.id for r in c.replies])
            if reply_ids:
                reply_votes = await self._get_user_votes(user_id, reply_ids)
                user_votes.update(reply_votes)
        
        # Найти лучший ответ (score > 0)
        top_comment_id = None
        if comments:
            top_score = max(c.score for c in comments)
            if top_score > 0:
                for c in comments:
                    if c.score == top_score:
                        top_comment_id = c.id
                        break
        
        # Преобразовать в ответ
        return [
            self._to_response(c, user_votes, top_comment_id)
            for c in comments
        ]
    
    async def _get_user_votes(
        self,
        user_id: int,
        comment_ids: List[int],
    ) -> dict[int, str]:
        """Получить голоса пользователя для данных комментариев."""
        if not comment_ids:
            return {}
        
        result = await self.db.execute(
            select(CommentVote)
            .where(
                CommentVote.user_id == user_id,
                CommentVote.comment_id.in_(comment_ids)
            )
        )
        votes = result.scalars().all()
        return {v.comment_id: v.vote_type.value for v in votes}
    
    def _to_response(
        self,
        comment: Comment,
        user_votes: dict[int, str],
        top_comment_id: Optional[int],
        include_replies: bool = True,
    ) -> CommentResponse:
        """Преобразовать модель Comment в схему ответа."""
        replies_list = []
        
        # Только включить ответы для верхнего уровня комментариев (один уровень вложенности)
        if include_replies and hasattr(comment, 'replies') and comment.replies:
            # Отсортировать ответы по score
            sorted_replies = sorted(
                comment.replies,
                key=lambda r: (r.score, r.created_at),
                reverse=True
            )
            replies_list = [
                self._to_response(r, user_votes, None, include_replies=False)
                for r in sorted_replies
            ]
        
        return CommentResponse(
            id=comment.id,
            content=comment.content,
            author_id=comment.author_id,
            author_name=comment.author_name,
            author_username=comment.author_username,
            author_display_name=comment.author_display_name,
            incident_id=comment.incident_id,
            guide_id=comment.guide_id,
            parent_id=comment.parent_id,
            score=comment.score,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            is_top_answer=comment.id == top_comment_id,
            replies=replies_list,
            user_vote=user_votes.get(comment.id),
        )
    
    async def create(
        self,
        data: CommentCreate,
        user: User,
    ) -> Comment:
        """Создать новый комментарий."""
        comment = Comment(
            content=data.content,
            author_id=user.id,
            author_name=user.display_name or user.username,
            incident_id=data.incident_id,
            guide_id=data.guide_id,
            parent_id=data.parent_id,
            score=0,
        )
        
        self.db.add(comment)
        await self.db.commit()
        await self.db.refresh(comment)
        
        return comment
    
    async def get_by_id(self, comment_id: int) -> Optional[Comment]:
        """Получить комментарий по ID."""
        result = await self.db.execute(
            select(Comment)
            .options(selectinload(Comment.author_user))
            .where(Comment.id == comment_id)
        )
        return result.scalar_one_or_none()
    
    async def update(
        self,
        comment: Comment,
        data: CommentUpdate,
    ) -> Comment:
        """Обновить комментарий."""
        comment.content = data.content
        await self.db.commit()
        await self.db.refresh(comment)
        return comment
    
    async def delete(self, comment: Comment) -> None:
        """Удалить комментарий и его ответы."""
        await self.db.delete(comment)
        await self.db.commit()
    
    async def vote(
        self,
        comment_id: int,
        user_id: int,
        vote_type: str,
    ) -> dict:
        """Голосовать на комментарии."""
        # Проверить существующий голос
        result = await self.db.execute(
            select(CommentVote).where(
                CommentVote.comment_id == comment_id,
                CommentVote.user_id == user_id,
            )
        )
        existing_vote = result.scalar_one_or_none()
        
        new_vote_type = CommentVoteType(vote_type)
        
        if existing_vote:
            if existing_vote.vote_type == new_vote_type:
                    # Удалить голос (переключиться в off)
                await self.db.delete(existing_vote)
                score_change = -1 if vote_type == "upvote" else 1
                action = "removed"
            else:
                # Изменить голос
                old_type = existing_vote.vote_type
                existing_vote.vote_type = new_vote_type
                # Если был upvote и теперь downvote: -2 (удалить +1, добавить -1)
                # Если был downvote и теперь upvote: +2 (удалить -1, добавить +1)
                score_change = 2 if vote_type == "upvote" else -2
                action = "changed"
        else:
            # Новый голос
            new_vote = CommentVote(
                comment_id=comment_id,
                user_id=user_id,
                vote_type=new_vote_type,
            )
            self.db.add(new_vote)
            score_change = 1 if vote_type == "upvote" else -1
            action = "added"
        
        # Обновить score комментария
        comment = await self.get_by_id(comment_id)
        if comment:
            comment.score += score_change
            await self.db.commit()
            
            return {
                "action": action,
                "new_score": comment.score,
                "user_vote": None if action == "removed" else vote_type,
            }
        
        return {"action": "error", "new_score": 0, "user_vote": None}
