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
    admin_token: str
    cors_origins: List[str] = ["*"]

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
