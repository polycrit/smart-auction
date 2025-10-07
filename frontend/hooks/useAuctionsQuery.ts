'use client';

import { useQuery } from '@tanstack/react-query';
import { auctionsKeys } from '@/lib/queryKeys';
import { listAuctions } from '@/lib/api';
import type { Auction } from '@/types/auction';

export function useAuctionsQuery() {
    return useQuery<Auction[]>({
        queryKey: auctionsKeys.list(),
        queryFn: () => listAuctions(),
        // keep old data while refetching for smoother UI
        placeholderData: (prev) => prev,
    });
}
