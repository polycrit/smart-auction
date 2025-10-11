"""
Utility functions for common operations across the application.
"""
import secrets
import string
from typing import Optional
from datetime import datetime


_ALPHABET = string.ascii_letters + string.digits


def generate_slug(length: int = 9) -> str:
    """Generate a random alphanumeric slug."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


def generate_token(length: int = 22) -> str:
    """Generate a secure random token."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


def to_iso_string(dt: Optional[datetime]) -> Optional[str]:
    """Convert datetime to ISO format string, handling None values."""
    return dt.isoformat() if dt else None


def serialize_uuid(uuid_obj) -> Optional[str]:
    """Convert UUID to string, handling None values."""
    return str(uuid_obj) if uuid_obj else None
