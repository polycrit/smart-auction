
class AuctionException(Exception):

    pass

class AuctionNotFoundError(AuctionException):

    pass

class ParticipantNotFoundError(AuctionException):

    pass

class LotNotFoundError(AuctionException):

    pass

class BidTooLowError(AuctionException):

    pass

class LotNotLiveError(AuctionException):

    pass

class InvalidStatusTransitionError(AuctionException):

    pass

class ParticipantBlockedError(AuctionException):

    pass
