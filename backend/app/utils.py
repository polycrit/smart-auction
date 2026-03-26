import secrets
import string
from typing import Optional
from datetime import datetime

_ALPHABET = string.ascii_letters + string.digits

def generate_slug(length: int = 9) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))

def generate_token(length: int = 22) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))

def to_iso_string(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None

def serialize_uuid(uuid_obj) -> Optional[str]:
    return str(uuid_obj) if uuid_obj else None
