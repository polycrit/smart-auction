'use client';

import { useAuctionsQuery } from '@/hooks/useAuctionsQuery';
import { AuctionCards } from '@/components/auction-cards';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/ui/page-header';

export default function Page() {
    const { data, isLoading, isFetching, isError, error, refetch } = useAuctionsQuery();

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <LoadingSpinner className="py-12" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="px-4 lg:px-6">
                <span className="text-red-600">Error: {error instanceof Error ? error.message : 'Failed to load auctions'}</span>
                <Button onClick={() => refetch()} size="sm" variant="outline" className="ml-3">
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* This container now has the same padding as the dashboard sections */}
            <div className="flex justify-between">
                <PageHeader text="Auctions" subtext="Manage you auctions" />
                <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? 'Refreshing…' : 'Refresh'}
                </Button>
            </div>
            <AuctionCards auctions={data ?? []} />
        </div>
    );
}
