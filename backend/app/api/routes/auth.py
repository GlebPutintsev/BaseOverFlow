from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Response, Request, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse, UserRoleUpdate, UserUpdate, UserPublicProfile
from app.models.user import User, UserRole

router = APIRouter()
security = HTTPBearer(auto_error=False)


async def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    """Получить сервис авторизации."""
    return AuthService(db)


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Получить текущего пользователя из токена (опционально - возвращает None если не авторизован)."""
    auth_service = AuthService(db)
    
    # Try Bearer token first
    token = None
    if credentials:
        token = credentials.credentials
    # Then try cookie
    elif auth_token:
        token = auth_token
    
    if not token:
        return None
    
    return await auth_service.get_current_user(token)


async def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """Получить текущего пользователя (обязательно - вызывает 401 если не авторизован)."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_reviewer_user(
    user: User = Depends(get_current_user),
) -> User:
    """Получить текущего пользователя если он является ревьюером или администратором."""
    if user.role not in [UserRole.REVIEWER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reviewer access required",
        )
    return user


async def get_admin_user(
    user: User = Depends(get_current_user),
) -> User:
    """Получить текущего пользователя если он является администратором."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Зарегистрировать нового пользователя."""
    try:
        user = await auth_service.create_user(
            email=data.email,
            username=data.username,
            password=data.password,
            display_name=data.display_name,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    token = auth_service.create_user_token(user)
    
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,  # 7 days
        samesite="lax",
    )
    
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Авторизовать пользователя и получить токен доступа."""
    user = await auth_service.authenticate_user(
        email_or_username=data.email_or_username,
        password=data.password,
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    
    token = auth_service.create_user_token(user)
    
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,  # 7 days
        samesite="lax",
    )
    
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout(response: Response):
    """Выйти - очистить токен авторизации."""
    response.delete_cookie("auth_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Получить профиль текущего пользователя."""
    return user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Обновить профиль текущего пользователя."""
    updated_user = await auth_service.update_profile(user.id, data)
    return updated_user


@router.get("/users/{username}/profile", response_model=UserPublicProfile)
async def get_user_profile(
    username: str,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Получить публичный профиль пользователя по username."""
    user = await auth_service.get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    admin: User = Depends(get_admin_user),
    auth_service: AuthService = Depends(get_auth_service),
    limit: int = 50,
    offset: int = 0,
):
    """Список всех пользователей (только для администратора).""" #нужно доделать
    return await auth_service.get_all_users(limit, offset)


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    admin: User = Depends(get_admin_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Обновить роль пользователя (только для администратора)."""
    user = await auth_service.update_user_role(user_id, data.role)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/users/{user_id}/block")
async def block_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Заблокировать пользователя (только для администратора). Нельзя заблокировать других администраторов."""
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot block an admin")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    await auth_service.set_user_active(user_id, False)
    return {"message": f"User {user.username} has been blocked"}


@router.post("/users/{user_id}/unblock") #нужно доделать
async def unblock_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Разблокировать пользователя (только для администратора)."""
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await auth_service.set_user_active(user_id, True)
    return {"message": f"User {user.username} has been unblocked"}
