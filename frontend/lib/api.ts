import axios from 'axios';
import type { Auction } from '@/types/auction';

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL!,
    withCredentials: false,
    timeout: 20000,
});

export async function getAuction(slug: string): Promise<Auction> {
    const { data } = await api.get(`/auctions/${slug}`);
    return data as Auction;
}

/** Lists auctions via the Next.js server proxy (keeps ADMIN_TOKEN secret). */
export async function listAuctions(): Promise<Auction[]> {
    const { data } = await axios.get<Auction[]>('/api/auctions', {
        headers: { 'Content-Type': 'application/json' },
    });
    return data;
}

export async function adminPost(path: string, body: unknown) {
    // goes through Next.js server proxy to keep ADMIN_TOKEN secret
    const { data } = await axios.post(`/api/admin/${path}`, body, {
        headers: { 'Content-Type': 'application/json' },
    });
    return data;
}
