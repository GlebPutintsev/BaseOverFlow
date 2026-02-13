from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, Integer, ForeignKey, Enum, func, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
import enum


class VoteType(str, enum.Enum):
    """Типы голосов"""
    UP = "up"       # +1
    DOWN = "down"   # -1


class TargetType(str, enum.Enum):
    """Типы сущностей для голосования"""
    INCIDENT = "incident"
    GUIDE = "guide"


class Vote(Base):
    """Модель для голосования"""
    
    __tablename__ = "votes"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # кто голосовал
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    
    target_type: Mapped[TargetType] = mapped_column(Enum(TargetType))
    target_id: Mapped[int] = mapped_column(Integer, index=True)
    
    vote_type: Mapped[VoteType] = mapped_column(Enum(VoteType))
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    
    user: Mapped["User"] = relationship("User", back_populates="votes")
    
    # один голос на пользователя на сущность
    __table_args__ = (
        UniqueConstraint('user_id', 'target_type', 'target_id', name='unique_user_vote'),
    )
    
    def __repr__(self) -> str:
        return f"<Vote(user={self.user_id}, {self.target_type.value}:{self.target_id}, {self.vote_type.value})>"


if TYPE_CHECKING:
    from app.models.user import User
