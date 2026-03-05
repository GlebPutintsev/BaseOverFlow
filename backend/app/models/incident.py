from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, Enum, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
import enum

if TYPE_CHECKING:
    from app.models.service import Service
    from app.models.tag import Tag
    from app.models.user import User
    from app.models.comment import Comment


class Severity(str, enum.Enum):
    """Incident severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Status(str, enum.Enum):
    """Incident status."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class PublishStatus(str, enum.Enum):
    DRAFT = "draft"           # Not submitted yet
    PENDING = "pending"       # Waiting for reviewer approval
    PUBLISHED = "published"   # Approved and visible to all
    REJECTED = "rejected"     # Rejected by reviewer


class Incident(Base):
    
    __tablename__ = "incidents"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    
    description: Mapped[str] = mapped_column(Text)  # Markdown
    
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stack_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Markdown
    
    solution: Mapped[str] = mapped_column(Text)  # Markdown
    
    prevention: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Markdown
    
    severity: Mapped[Severity] = mapped_column(
        Enum(Severity),
        default=Severity.MEDIUM,
    )
    status: Mapped[Status] = mapped_column(
        Enum(Status),
        default=Status.RESOLVED,
    )
    
    author: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    author_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    views: Mapped[int] = mapped_column(Integer, default=0)
    
    score: Mapped[int] = mapped_column(Integer, default=0)
    
    publish_status: Mapped[PublishStatus] = mapped_column(
        Enum(PublishStatus, values_callable=lambda x: [e.value for e in x]),
        default=PublishStatus.PUBLISHED,
    )
    
    is_pinned: Mapped[bool] = mapped_column(default=False)
    
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    image_position: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="50 50")
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    incident_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    service_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("services.id", ondelete="CASCADE"),
        index=True,
    )
    
    service: Mapped["Service"] = relationship("Service", back_populates="incidents")
    tags: Mapped[list["Tag"]] = relationship(
        "Tag",
        secondary="incident_tags",
        back_populates="incidents",
    )
    author_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[author_id], lazy="joined")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="incident", cascade="all, delete-orphan")
    
    @property
    def author_username(self) -> Optional[str]:
        return self.author_user.username if self.author_user else None
    
    def __repr__(self) -> str:
        return f"<Incident(title='{self.title}')>"

