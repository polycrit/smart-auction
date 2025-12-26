"""
Centralized configuration management using pydantic-settings.
All environment variables and application settings are defined here.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str

    # Redis & Queue
    redis_url: str = "redis://redis:6379/0"

    # Security
    admin_token: str  # Legacy token (will be deprecated)
    jwt_secret: str = "change-me-in-production"  # JWT signing secret
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 hours
    cors_origins: List[str] = ["*"]

    # Master admin credentials (created on first run)
    master_admin_username: str = "admin"
    master_admin_password: str = "admin"  # Change in production!

    # Application
    app_title: str = "Auction Backend"
    debug: bool = False

    # AWS S3 for image uploads
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "eu-central-1"
    s3_bucket_name: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Global settings instance
settings = Settings()
