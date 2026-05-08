"""认证服务 — 密码哈希、JWT 令牌、注册/登录"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_TOKEN_EXPIRE_HOURS = 24


class AuthService:
    """认证服务：密码管理 + JWT + 用户注册/登录"""

    # ── 密码 ──────────────────────────────────────────

    @staticmethod
    def hash_password(password: str) -> str:
        """使用 bcrypt 哈希密码"""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        """验证明文密码与哈希是否匹配"""
        return pwd_context.verify(plain, hashed)

    # ── JWT ──────────────────────────────────────────

    @staticmethod
    def create_access_token(user_id: str | UUID, username: str) -> str:
        """创建 JWT access token（HS256，24小时过期）"""
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        payload = {
            "sub": str(user_id),
            "username": username,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    @staticmethod
    def decode_token(token: str) -> dict | None:
        """解码 JWT token，失败返回 None"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            return payload
        except JWTError:
            return None

    # ── 用户操作 ─────────────────────────────────────

    @staticmethod
    async def register(
        db: AsyncSession,
        username: str,
        email: str,
        password: str,
        display_name: str | None = None,
    ) -> User:
        """注册新用户"""
        # 检查用户名是否已存在
        result = await db.execute(select(User).where(User.username == username))
        if result.scalar_one_or_none():
            raise ValueError("用户名已存在")

        # 检查邮箱是否已存在
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            raise ValueError("邮箱已被注册")

        user = User(
            username=username,
            email=email,
            hashed_password=AuthService.hash_password(password),
            display_name=display_name or username,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def authenticate(
        db: AsyncSession, username: str, password: str
    ) -> User | None:
        """验证用户登录，成功返回 User，失败返回 None"""
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if user is None:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user
