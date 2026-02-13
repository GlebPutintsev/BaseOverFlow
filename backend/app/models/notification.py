from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, Enum, func, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
import enum


class NotificationType(str, enum.Enum):
    """Notification types."""
    NEW_ITEM_PENDING = "new_item_pending"   # нужно ревью
    ITEM_APPROVED = "item_approved"          # запись одобрена модером
    ITEM_REJECTED = "item_rejected"          # запись отклонена модером
    NEW_VOTE = "new_vote"                    # новый голос
    MENTION = "mention"                       # нужно допилить(кто то тебя отметил)


class Notification(Base):
    """Notification model for user notifications."""
    
    __tablename__ = "notifications"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType))
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    user: Mapped["User"] = relationship("User", back_populates="notifications")
    
    def __repr__(self) -> str:
        return f"<Notification(user={self.user_id}, type='{self.type.value}', read={self.is_read})>"


if TYPE_CHECKING:
    from app.models.user import User
