"""
Сервис регистрации, логина и JWT tokens.
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt
from jose import JWTError, jwt

from app.models.user import User, UserRole
from app.config import settings


# настройки JWT
SECRET_KEY = getattr(settings, 'SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверить пароль против его хеша."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return bcrypt.hashpw(
        password.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


class AuthService:
    """Service for authentication operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        result = await self.db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def create_user(
        self,
        email: str,
        username: str,
        password: str,
        display_name: Optional[str] = None,
        role: UserRole = UserRole.USER,
    ) -> User:
        """Create a new user."""
        # Check if email or username already exists
        if await self.get_user_by_email(email):
            raise ValueError("Email already registered")
        if await self.get_user_by_username(username):
            raise ValueError("Username already taken")
        
        user = User(
            email=email,
            username=username,
            password_hash=get_password_hash(password),
            display_name=display_name or username,
            role=role,
        )
        
        self.db.add(user)
        await self.db.flush()
        return user
    
    async def authenticate_user(self, email_or_username: str, password: str) -> Optional[User]:
        """Authenticate a user by email/username and password."""
        # Try email first
        user = await self.get_user_by_email(email_or_username)
        if not user:
            user = await self.get_user_by_username(email_or_username)
        
        if not user:
            return None
        
        if not verify_password(password, user.password_hash):
            return None
        
        if not user.is_active:
            return None
        
        user.last_login = datetime.utcnow()
        await self.db.flush()
        
        return user
    
    def create_user_token(self, user: User) -> str:
        """Create JWT token for a user."""
        return create_access_token({
            "sub": str(user.id),
            "username": user.username,
            "role": user.role.value,
        })
    
    async def get_current_user(self, token: str) -> Optional[User]:
        """Get current user from JWT token."""
        payload = decode_token(token)
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        return await self.get_user_by_id(int(user_id))
    
    async def get_all_users(self, limit: int = 50, offset: int = 0) -> list[User]:
        """Get all users (admin only)."""
        result = await self.db.execute(
            select(User)
            .order_by(User.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())
    
    async def update_user_role(self, user_id: int, new_role: UserRole) -> Optional[User]:
        """Update user role (admin only)."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        user.role = new_role
        await self.db.flush()
        return user
    
    async def get_reviewers(self) -> list[User]:
        """Get all reviewers and admins."""
        result = await self.db.execute(
            select(User).where(
                User.role.in_([UserRole.REVIEWER, UserRole.ADMIN])
            )
        )
        return list(result.scalars().all())
    
    async def set_user_active(self, user_id: int, is_active: bool) -> Optional[User]:
        """Set user active status (block/unblock)."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        user.is_active = is_active
        await self.db.flush()
        return user
    
    async def update_profile(self, user_id: int, data) -> Optional[User]:
        """Update user profile."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)
        
        await self.db.flush()
        return user
