import { apiClient, adminClient } from './client';
import type { Auction, AuctionStatus } from '@/types/auction';

export const auctionsApi = {
    // Public endpoints
    getAuction: async (slug: string): Promise<Auction> => {
        const { data } = await apiClient.get<Auction>(`/auctions/${slug}`);
        return data;
    },

    // Admin endpoints
    listAuctions: async (): Promise<Auction[]> => {
        const { data } = await adminClient.get<Auction[]>('/../auctions');
        return data;
    },

    createAuction: async (payload: {
        title: string;
        description?: string | null;
        start_time?: string | null;
        end_time?: string | null;
    }): Promise<{ id: string; slug: string; public_url: string }> => {
        const { data } = await adminClient.post('/auctions', payload);
        return data;
    },

    updateAuctionStatus: async (
        slug: string,
        status: AuctionStatus
    ): Promise<{ status: AuctionStatus }> => {
        const { data } = await adminClient.post(`/auctions/${slug}/status`, { status });
        return data;
    },

    deleteAuction: async (slug: string): Promise<void> => {
        await adminClient.delete(`/auctions/${slug}`);
    },

    // Lots
    createLot: async (
        slug: string,
        payload: {
            name: string;
            base_price: string | number;
            min_increment: string | number;
            currency: string;
        }
    ) => {
        const { data } = await adminClient.post(`/auctions/${slug}/lots`, payload);
        return data;
    },
};
