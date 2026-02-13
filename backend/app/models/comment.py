from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import ForeignKey, String, Text, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.incident import Incident
    from app.models.guide import Guide


class CommentVoteType(enum.Enum):
    UPVOTE = "upvote"
    DOWNVOTE = "downvote"


class Comment(Base):
    __tablename__ = "comments"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    author_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    incident_id: Mapped[Optional[int]] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True)
    guide_id: Mapped[Optional[int]] = mapped_column(ForeignKey("guides.id", ondelete="CASCADE"), nullable=True)
    
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    
    # Voting score
    score: Mapped[int] = mapped_column(Integer, default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(onupdate=datetime.utcnow, nullable=True)
    
    author_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[author_id], lazy="joined")
    incident: Mapped[Optional["Incident"]] = relationship("Incident", back_populates="comments")
    guide: Mapped[Optional["Guide"]] = relationship("Guide", back_populates="comments")
    
    parent: Mapped[Optional["Comment"]] = relationship(
        "Comment",
        remote_side=[id],
        back_populates="replies",
        foreign_keys=[parent_id]
    )
    replies: Mapped[List["Comment"]] = relationship(
        "Comment",
        back_populates="parent",
        foreign_keys=[parent_id],
        lazy="selectin"
    )
    
    votes: Mapped[List["CommentVote"]] = relationship(
        "CommentVote",
        back_populates="comment",
        cascade="all, delete-orphan"
    )
    
    @property
    def author_username(self) -> Optional[str]:
        """Get author username from relationship."""
        if self.author_user:
            return self.author_user.username
        return None
    
    @property
    def author_display_name(self) -> Optional[str]:
        """Get author display name."""
        if self.author_user:
            return self.author_user.display_name or self.author_user.username
        return self.author_name


class CommentVote(Base):
    """Vote on a comment."""
    __tablename__ = "comment_votes"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comment_id: Mapped[int] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), nullable=False)
    vote_type: Mapped[CommentVoteType] = mapped_column(SQLEnum(CommentVoteType), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship("User", lazy="joined")
    comment: Mapped["Comment"] = relationship("Comment", back_populates="votes")
