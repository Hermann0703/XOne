"""认证 API — 注册、登录、令牌刷新"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["认证"])

auth_service = AuthService()


# ─── 请求/响应模型 ──────────────────────────────────


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    display_name: str | None = None

    @field_validator("username")
    @classmethod
    def username_min_length(cls, v: str) -> str:
        if len(v.strip()) < 3:
            raise ValueError("用户名至少 3 个字符")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("密码至少 6 个字符")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    email: str
    display_name: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str
    token_type: str = "bearer"


# ─── 端点 ───────────────────────────────────────────


@router.post("/register", response_model=AuthResponse, summary="用户注册")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """注册新用户，返回用户信息和 JWT token"""
    try:
        user = await auth_service.register(
            db=db,
            username=req.username,
            email=req.email,
            password=req.password,
            display_name=req.display_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    token = auth_service.create_access_token(user.id, user.username)
    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=token,
    )


@router.post("/login", response_model=AuthResponse, summary="用户登录")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户名 + 密码登录，返回用户信息和 JWT token"""
    user = await auth_service.authenticate(db, req.username, req.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用",
        )

    token = auth_service.create_access_token(user.id, user.username)
    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=token,
    )


@router.get("/me", response_model=UserOut, summary="当前用户信息")
async def read_current_user(current_user: User = Depends(get_current_active_user)):
    """获取当前已登录用户的信息"""
    return UserOut.model_validate(current_user)
