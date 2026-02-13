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


class GuideType(str, enum.Enum):
    HOWTO = "howto"           # How-to guide
    RUNBOOK = "runbook"       # Operational runbook
    REFERENCE = "reference"   # Reference documentation
    TUTORIAL = "tutorial"     # Step-by-step tutorial
    FAQ = "faq"               # Frequently asked questions


class PublishStatus(str, enum.Enum):
    DRAFT = "draft"           # Not submitted yet
    PENDING = "pending"       # Waiting for reviewer approval
    PUBLISHED = "published"   # Approved and visible to all
    REJECTED = "rejected"     # Rejected by reviewer


class Guide(Base):
    
    __tablename__ = "guides"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Short summary
    content: Mapped[str] = mapped_column(Text)  # Markdown
    
    guide_type: Mapped[GuideType] = mapped_column(
        Enum(GuideType),
        default=GuideType.HOWTO,
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
        default=PublishStatus.PUBLISHED,  # Default published for backward compatibility
    )
    
    is_pinned: Mapped[bool] = mapped_column(default=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    
    service_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("services.id", ondelete="CASCADE"),
        index=True,
    )
    
    service: Mapped["Service"] = relationship("Service", back_populates="guides")
    tags: Mapped[list["Tag"]] = relationship(
        "Tag",
        secondary="guide_tags",
        back_populates="guides",
    )
    author_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[author_id], lazy="joined")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="guide", cascade="all, delete-orphan")
    
    @property
    def author_username(self) -> Optional[str]:
        """Get author's username."""
        return self.author_user.username if self.author_user else None
    
    def __repr__(self) -> str:
        return f"<Guide(title='{self.title}')>"

