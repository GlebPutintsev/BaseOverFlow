from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, DateTime, Integer, Enum, func, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    """User roles."""
    USER = "user"           # обычный пользователь
    REVIEWER = "reviewer"   # может одобрять/отклонять pending items
    ADMIN = "admin"         # полное управление


class User(Base):
    """Модель для пользователей"""
    
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    
    # профиль
    display_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    position: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    skills: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # роль и статус
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x]),
        default=UserRole.USER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # репутация как в стековер
    reputation: Mapped[int] = mapped_column(Integer, default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # отношения
    votes: Mapped[list["Vote"]] = relationship("Vote", back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user")
    
    def __repr__(self) -> str:
        return f"<User(username='{self.username}', role='{self.role.value}')>"


if TYPE_CHECKING:
    from app.models.vote import Vote
    from app.models.notification import Notification
