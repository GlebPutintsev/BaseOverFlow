from datetime import datetime
from typing import Optional, TYPE_CHECKING, List
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base

if TYPE_CHECKING:
    from app.models.incident import Incident
    from app.models.guide import Guide


class Service(Base):
    __tablename__ = "services"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), index=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="folder")
    color: Mapped[str] = mapped_column(String(7), default="#3b82f6")  # HEX color
    
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("services.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    
    parent: Mapped[Optional["Service"]] = relationship(
        "Service",
        back_populates="children",
        remote_side=[id],
    )
    children: Mapped[List["Service"]] = relationship(
        "Service",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
    
    # отношения с контентом
    incidents: Mapped[list["Incident"]] = relationship(
        "Incident",
        back_populates="service",
        cascade="all, delete-orphan",
    )
    guides: Mapped[list["Guide"]] = relationship(
        "Guide",
        back_populates="service",
        cascade="all, delete-orphan",
    )
    
    @property
    def incidents_count(self) -> int:
        return len(self.incidents)
    
    @property
    def guides_count(self) -> int:
        return len(self.guides)
    
    def __repr__(self) -> str:
        return f"<Service(name='{self.name}')>"

