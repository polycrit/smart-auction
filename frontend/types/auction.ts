// Domain primitives
export type UUID = string;

// Status unions
export type AuctionStatus = 'draft' | 'live' | 'paused' | 'ended';

// Core entities
export type Lot = {
    id: UUID;
    lot_number: number;
    name: string;
    base_price: string;
    min_increment: string;
    currency: string;
    current_price: string;
    current_leader: UUID | null;
    end_time: string | null;
};

export type Auction = {
    id: UUID;
    slug: string;
    title: string;
    description?: string | null;
    status: AuctionStatus;
    start_time?: string | null;
    end_time?: string | null;
    created_at: string;
    lots: Lot[];
};

// Socket.IO event payloads (optional but handy across app)
export type StateSnapshot = {
    type?: 'state';
    auction: {
        slug: string;
        title: string;
        status: AuctionStatus;
        start_time: string | null;
        end_time: string | null;
    };
    lots: Array<{
        id: UUID;
        lot_number: number;
        name: string;
        currency: string;
        current_price: string;
        current_leader: UUID | null;
        end_time: string | null;
    }>;
    participants: { count: number };
};

export type BidAccepted = {
    type?: 'bid_accepted';
    lot_id: UUID;
    amount: string;
    leader: UUID;
    ends_at: string | null;
};

export type BidRejected = {
    type?: 'bid_rejected';
    reason: string;
};

export type StatusEvent = {
    type?: 'status';
    status: AuctionStatus;
};

export type ErrorEvent = {
    type?: 'error';
    detail: string;
};

export type AuctionWSEvent = StateSnapshot | BidAccepted | BidRejected | StatusEvent | ErrorEvent;
