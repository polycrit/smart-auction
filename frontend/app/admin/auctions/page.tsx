'use client';

import { useAuctionsQuery } from '@/hooks/useAuctionsQuery';
import { AuctionCards } from '@/components/auction-cards';
import { Button } from '@/components/ui/button';

export default function Page() {
    const { data, isLoading, isFetching, isError, error, refetch } = useAuctionsQuery();

    if (isLoading) {
        return <div className="px-4 lg:px-6 py-6">Loading auctions…</div>;
    }

    if (isError) {
        return (
            <div className="px-4 lg:px-6 py-6 text-sm">
                <span className="text-red-600">Error: {error instanceof Error ? error.message : 'Failed to load auctions'}</span>
                <Button onClick={() => refetch()} size="sm" variant="outline" className="ml-3">
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="px-4 lg:px-6">
            {/* subtle top-right refresh control */}
            <div className="flex justify-end py-3">
                <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? 'Refreshing…' : 'Refresh'}
                </Button>
            </div>
            <AuctionCards auctions={data ?? []} />
        </div>
    );
}
