from pydantic import BaseModel, Field


class TagBase(BaseModel):
    """Базовая схема для тега"""
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    id: int
    
    class Config:
        from_attributes = True

