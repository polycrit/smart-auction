import axios from 'axios';
import type { Auction } from '@/types/auction';
import type { Vendor, VendorCreate } from '@/types/vendor';

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL!,
    withCredentials: false,
    timeout: 20000,
    headers: {
        'ngrok-skip-browser-warning': 'true',
    },
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

export async function adminGet(path: string) {
    // goes through Next.js server proxy to keep ADMIN_TOKEN secret
    const { data } = await axios.get(`/api/admin/${path}`, {
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

export async function adminDelete(path: string) {
    // goes through Next.js server proxy to keep ADMIN_TOKEN secret
    const { data } = await axios.delete(`/api/admin/${path}`, {
        headers: { 'Content-Type': 'application/json' },
    });
    return data;
}

export async function adminPut(path: string, body: unknown) {
    // goes through Next.js server proxy to keep ADMIN_TOKEN secret
    const { data } = await axios.put(`/api/admin/${path}`, body, {
        headers: { 'Content-Type': 'application/json' },
    });
    return data;
}

// Vendor API functions
export async function listVendors(): Promise<Vendor[]> {
    const { data } = await axios.get<Vendor[]>('/api/admin/vendors', {
        headers: { 'Content-Type': 'application/json' },
    });
    return data;
}

export async function createVendor(vendor: VendorCreate): Promise<Vendor> {
    return await adminPost('vendors', vendor) as Vendor;
}

export async function getVendor(id: string): Promise<Vendor> {
    return await adminGet(`vendors/${id}`) as Vendor;
}

export async function updateVendor(id: string, vendor: VendorCreate): Promise<Vendor> {
    return await adminPut(`vendors/${id}`, vendor) as Vendor;
}

export async function deleteVendor(id: string) {
    return await adminDelete(`vendors/${id}`);
}
