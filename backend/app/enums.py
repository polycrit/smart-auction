"""
Enums for auction system to ensure type safety and validation.
"""
from enum import Enum


class AuctionStatus(str, Enum):
    """Valid auction statuses."""
    DRAFT = "draft"
    LIVE = "live"
    PAUSED = "paused"
    ENDED = "ended"


class Currency(str, Enum):
    """Supported currencies."""
    EUR = "EUR"
    USD = "USD"
    GBP = "GBP"
