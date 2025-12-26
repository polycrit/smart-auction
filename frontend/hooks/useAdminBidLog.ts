'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bidLogKeys } from '@/lib/queryKeys';
import { adminGet } from '@/lib/api';
import { connectAdminSocket, getAdminToken } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

export type BidLogEntry = {
    id: string;
    lot_id: string;
    lot_number: number;
    lot_name: string;
    vendor_name: string;
    amount: string;
    currency: string;
    placed_at: string;
};

export function useAdminBidLog(slug: string) {
    const queryClient = useQueryClient();
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    // Initial REST fetch
    const query = useQuery({
        queryKey: bidLogKeys.byAuction(slug),
        queryFn: () => adminGet(`auctions/${slug}/bids`) as Promise<BidLogEntry[]>,
        enabled: !!slug,
    });

    // WebSocket for real-time updates
    useEffect(() => {
        if (!slug) return;

        const token = getAdminToken();
        if (!token) {
            console.error('No admin token available for WebSocket');
            return;
        }

        const socket = connectAdminSocket(token);
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            // Join the auction room
            socket.emit('join_auction', { slug });
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.error('Admin WebSocket connection error:', err.message);
            setConnected(false);
        });

        // Listen for new bid log entries
        socket.on('bid_log_entry', (entry: BidLogEntry) => {
            // Prepend new entry to the cached data
            queryClient.setQueryData<BidLogEntry[]>(
                bidLogKeys.byAuction(slug),
                (old) => (old ? [entry, ...old] : [entry])
            );
        });

        return () => {
            socket.emit('leave_auction', { slug });
            socket.disconnect();
        };
    }, [slug, queryClient]);

    return {
        bids: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        connected,
    };
}
