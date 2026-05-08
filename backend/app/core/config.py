from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "XOne API"
    VERSION: str = "1.0.0"
    MODE: str = "development"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://xone:xone_dev@localhost:5432/xone"
    MONGODB_URL: str = "mongodb://admin:xone_dev@localhost:27017"
    MONGODB_DB: str = "xone"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Meilisearch
    MEILISEARCH_URL: str = "http://localhost:7700"
    MEILISEARCH_KEY: str = "xone_dev_key"

    # Qdrant
    QDRANT_URL: str = "http://localhost:6333"

    # MinIO
    MINIO_URL: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"

    # Security
    SECRET_KEY: str = "change-me-in-production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
