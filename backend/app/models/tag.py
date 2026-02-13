from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


# таблицы для многие-ко-многим
incident_tags = Table(
    "incident_tags",
    Base.metadata,
    Column("incident_id", Integer, ForeignKey("incidents.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

guide_tags = Table(
    "guide_tags",
    Base.metadata,
    Column("guide_id", Integer, ForeignKey("guides.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    """Модель для тегов"""
    
    __tablename__ = "tags"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    color: Mapped[str] = mapped_column(String(7), default="#6366f1")  # HEX color
    
    # Relationships
    incidents: Mapped[list["Incident"]] = relationship(
        "Incident",
        secondary=incident_tags,
        back_populates="tags",
    )
    guides: Mapped[list["Guide"]] = relationship(
        "Guide",
        secondary=guide_tags,
        back_populates="tags",
    )
    
    def __repr__(self) -> str:
        return f"<Tag(name='{self.name}')>"

