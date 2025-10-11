'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuction } from '@/lib/api';
import { connectAuctionSocket } from '@/lib/socket';
import type { Auction, Lot, StateSnapshot, BidAccepted, BidRejected, StatusEvent, ErrorEvent } from '@/types/auction';

type State = {
    auction?: Auction;
    lots: Record<string, Lot>;
    status?: Auction['status'];
    connected: boolean;
    lastError?: string;
};

function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : 'Load failed';
}

export function useAuction(slug: string, inviteToken?: string) {
    const [state, setState] = useState<State>({ lots: {}, connected: false });
    const socketRef = useRef<ReturnType<typeof connectAuctionSocket> | null>(null);

    // Initial REST load
    useEffect(() => {
        let active = true;
        getAuction(slug)
            .then((auct: Auction) => {
                if (!active) return;
                setState((s) => ({
                    ...s,
                    auction: auct,
                    status: auct.status,
                    lots: Object.fromEntries(auct.lots.map((l) => [l.id, l])),
                }));
            })
            .catch((e: unknown) => setState((s) => ({ ...s, lastError: errorMessage(e) })));
        return () => {
            active = false;
        };
    }, [slug]);

    // Socket.IO live updates
    useEffect(() => {
        const socket = connectAuctionSocket(slug, inviteToken);
        socketRef.current = socket;

        socket.on('connect', () => setState((s) => ({ ...s, connected: true })));
        socket.on('disconnect', () => setState((s) => ({ ...s, connected: false })));

        socket.on('state', (msg: StateSnapshot) => {
            setState((s) => ({
                ...s,
                status: msg.auction.status,
                lots: Object.fromEntries(
                    msg.lots.map((l) => [
                        l.id,
                        {
                            id: l.id,
                            lot_number: l.lot_number,
                            name: l.name,
                            base_price: s.lots[l.id]?.base_price ?? '0',
                            min_increment: s.lots[l.id]?.min_increment ?? '1',
                            currency: l.currency,
                            current_price: l.current_price,
                            current_leader: l.current_leader,
                            end_time: l.end_time,
                        },
                    ])
                ),
            }));
        });

        socket.on('bid_accepted', (payload: BidAccepted) => {
            setState((s) => {
                const lot = s.lots[payload.lot_id];
                if (!lot) return s;
                return {
                    ...s,
                    lots: {
                        ...s.lots,
                        [payload.lot_id]: {
                            ...lot,
                            current_price: payload.amount,
                            current_leader: payload.leader,
                            end_time: payload.ends_at ?? lot.end_time,
                        },
                    },
                };
            });
        });

        socket.on('bid_rejected', (p: BidRejected) => setState((s) => ({ ...s, lastError: p.reason || 'Bid rejected' })));
        socket.on('status', (p: StatusEvent) => setState((s) => ({ ...s, status: p.status })));
        socket.on('error', (p: ErrorEvent) => setState((s) => ({ ...s, lastError: p.detail || 'Error' })));

        return () => {
            socket.disconnect();
        };
    }, [slug, inviteToken]);

    const placeBid = (lotId: string, amount: string | number) => {
        socketRef.current?.emit('place_bid', { lot_id: lotId, amount });
    };

    const lots = useMemo(() => Object.values(state.lots).sort((a, b) => a.lot_number - b.lot_number), [state.lots]);

    return { ...state, lots, placeBid };
}
