"""
Сервис для голосования на инцидентах и гайдах.
"""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vote import Vote, VoteType, TargetType
from app.models.incident import Incident
from app.models.guide import Guide
from app.models.user import User


class VoteService:
    """Сервис для операций голосования."""
    
    # Очки репутации (допилить нужно)
    UPVOTE_GIVEN_COST = 0
    DOWNVOTE_GIVEN_COST = 1
    UPVOTE_RECEIVED = 10
    DOWNVOTE_RECEIVED = -2
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_user_vote(
        self,
        user_id: int,
        target_type: TargetType,
        target_id: int,
    ) -> Optional[Vote]:
        """Получить голос пользователя на конкретной сущности."""
        result = await self.db.execute(
            select(Vote).where(
                Vote.user_id == user_id,
                Vote.target_type == target_type,
                Vote.target_id == target_id,
            )
        )
        return result.scalar_one_or_none()
    
    async def vote(
        self,
        user: User,
        target_type: TargetType,
        target_id: int,
        vote_type: VoteType,
    ) -> dict:
        """
        Голосовать на сущности. Возвращает новый score и голос пользователя.
        
        Если пользователь уже голосовал за ту же сущность, удаляет голос.
        """
        # Получить целевую сущность
        if target_type == TargetType.INCIDENT:
            item = await self.db.get(Incident, target_id)
        else:
            item = await self.db.get(Guide, target_id)
        
        if not item:
            raise ValueError(f"{target_type.value} not found")
        
        # Проверить, если пользователь уже голосовал за ту же сущность
        existing_vote = await self.get_user_vote(user.id, target_type, target_id)
        
        author_id = item.author_id
        
        if existing_vote:
            if existing_vote.vote_type == vote_type:
                await self._remove_vote(existing_vote, item, author_id)
                return {
                    "score": item.score,
                    "user_vote": None,
                }
            else:
                await self._change_vote(existing_vote, vote_type, item, author_id)
                return {
                    "score": item.score,
                    "user_vote": vote_type.value,
                }
        else:
            # Новый голос
            await self._add_vote(user, target_type, target_id, vote_type, item, author_id)
            return {
                "score": item.score,
                "user_vote": vote_type.value,
            }
    
    async def _add_vote(
        self,
        user: User,
        target_type: TargetType,
        target_id: int,
        vote_type: VoteType,
        item,
        author_id: Optional[int],
    ):
        """Добавить новый голос."""
        vote = Vote(
            user_id=user.id,
            target_type=target_type,
            target_id=target_id,
            vote_type=vote_type,
        )
        self.db.add(vote)
        
        # Обновить score сущности
        if vote_type == VoteType.UP:
            item.score += 1
            if author_id and author_id != user.id:
                author = await self.db.get(User, author_id)
                if author:
                    author.reputation += self.UPVOTE_RECEIVED
        else:
            item.score -= 1
            if author_id and author_id != user.id:
                author = await self.db.get(User, author_id)
                if author:
                    author.reputation += self.DOWNVOTE_RECEIVED
        
        await self.db.flush()
    
    async def _remove_vote(self, vote: Vote, item, author_id: Optional[int]):
        """Удалить существующий голос."""
        if vote.vote_type == VoteType.UP:
            item.score -= 1
            if author_id:
                author = await self.db.get(User, author_id)
                if author:
                    author.reputation -= self.UPVOTE_RECEIVED
        else:
            item.score += 1
            if author_id:
                author = await self.db.get(User, author_id)
                if author:
                    author.reputation -= self.DOWNVOTE_RECEIVED
        
        await self.db.delete(vote)
        await self.db.flush()
    
    async def _change_vote(
        self,
        vote: Vote,
        new_vote_type: VoteType,
        item,
        author_id: Optional[int],
    ):
        """Изменить существующий голос."""
        old_vote_type = vote.vote_type
        vote.vote_type = new_vote_type
        
        # Обновить score (изменение на 2: -1 становится +1 или наоборот)
        if new_vote_type == VoteType.UP:
            item.score += 2
            if author_id:
                author = await self.db.get(User, author_id)
                if author:
                    author.reputation -= self.DOWNVOTE_RECEIVED
                    author.reputation += self.UPVOTE_RECEIVED
        else:
            item.score -= 2
            if author_id:
                author = await self.db.get(User, author_id)
                if author:
                    author.reputation -= self.UPVOTE_RECEIVED
                    author.reputation += self.DOWNVOTE_RECEIVED
        
        await self.db.flush()
    
    async def get_item_votes(
        self,
        target_type: TargetType,
        target_id: int,
    ) -> dict:
        """Получить количество голосов для сущности."""
        # Подсчитать upvotes
        up_result = await self.db.execute(
            select(func.count()).select_from(Vote).where(
                Vote.target_type == target_type,
                Vote.target_id == target_id,
                Vote.vote_type == VoteType.UP,
            )
        )
        upvotes = up_result.scalar() or 0
        
        # Подсчитать downvotes
        down_result = await self.db.execute(
            select(func.count()).select_from(Vote).where(
                Vote.target_type == target_type,
                Vote.target_id == target_id,
                Vote.vote_type == VoteType.DOWN,
            )
        )
        downvotes = down_result.scalar() or 0
        
        return {
            "upvotes": upvotes,
            "downvotes": downvotes,
            "score": upvotes - downvotes,
        }
