'use client';

import { useQuery } from '@tanstack/react-query';
import { bidLogKeys } from '@/lib/queryKeys';
import { adminGet } from '@/lib/api';

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

export function useBidLogQuery(slug: string) {
    return useQuery({
        queryKey: bidLogKeys.byAuction(slug),
        queryFn: () => adminGet(`auctions/${slug}/bids`) as Promise<BidLogEntry[]>,
        enabled: !!slug,
        refetchInterval: 5000, // Refresh every 5 seconds
    });
}
