"""
Custom exceptions for the auction application.
"""


class AuctionException(Exception):
    """Base exception for all auction-related errors."""

    pass


class AuctionNotFoundError(AuctionException):
    """Raised when an auction is not found."""

    pass


class ParticipantNotFoundError(AuctionException):
    """Raised when a participant is not found."""

    pass


class LotNotFoundError(AuctionException):
    """Raised when a lot is not found."""

    pass


class BidTooLowError(AuctionException):
    """Raised when a bid amount is too low."""

    pass


class LotNotLiveError(AuctionException):
    """Raised when attempting to bid on a lot that is not live."""

    pass


class InvalidStatusTransitionError(AuctionException):
    """Raised when an invalid status transition is attempted."""

    pass


class ParticipantBlockedError(AuctionException):
    """Raised when a blocked participant attempts an action."""

    pass
