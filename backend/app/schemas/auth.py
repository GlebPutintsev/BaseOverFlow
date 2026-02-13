from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from app.models.user import UserRole


class UserRegister(BaseModel):
    """Схема для регистрации пользователя"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
    password: str = Field(..., min_length=6, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)


class UserLogin(BaseModel):
    """Схема для входа пользователя"""
    email_or_username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """Схема для ответа токена"""
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    """Схема для ответа пользователя"""
    id: int
    email: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str] = None
    position: Optional[str] = None
    skills: Optional[str] = None
    role: UserRole
    reputation: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserPublicProfile(BaseModel):
    """Публичный профиль (без email)"""
    id: int
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str] = None
    position: Optional[str] = None
    skills: Optional[str] = None
    role: UserRole
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Схема для обновления профиля пользователя"""
    display_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    bio: Optional[str] = Field(None, max_length=1000)
    position: Optional[str] = Field(None, max_length=200)
    skills: Optional[str] = Field(None, max_length=500)


class UserRoleUpdate(BaseModel):
    """Схема для обновления роли пользователя (только для админа)"""
    role: UserRole


TokenResponse.model_rebuild()
