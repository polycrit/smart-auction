from enum import Enum

class AuctionStatus(str, Enum):
    DRAFT = "draft"
    LIVE = "live"
    PAUSED = "paused"
    ENDED = "ended"

class Currency(str, Enum):
    EUR = "EUR"
    USD = "USD"
    GBP = "GBP"
