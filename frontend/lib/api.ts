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

/** Get auth headers with JWT token if available */
function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Only access localStorage in browser
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('admin_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
}

export async function getAuction(slug: string): Promise<Auction> {
    const { data } = await api.get(`/auctions/${slug}`);
    return data as Auction;
}

/** Lists auctions via the Next.js server proxy. */
export async function listAuctions(): Promise<Auction[]> {
    const { data } = await axios.get<Auction[]>('/api/auctions', {
        headers: getAuthHeaders(),
    });
    return data;
}

export async function adminGet(path: string) {
    const { data } = await axios.get(`/api/admin/${path}`, {
        headers: getAuthHeaders(),
    });
    return data;
}

export async function adminPost(path: string, body: unknown) {
    const { data } = await axios.post(`/api/admin/${path}`, body, {
        headers: getAuthHeaders(),
    });
    return data;
}

export async function adminDelete(path: string) {
    const { data } = await axios.delete(`/api/admin/${path}`, {
        headers: getAuthHeaders(),
    });
    return data;
}

export async function adminPut(path: string, body: unknown) {
    const { data } = await axios.put(`/api/admin/${path}`, body, {
        headers: getAuthHeaders(),
    });
    return data;
}

// Vendor API functions
export async function listVendors(): Promise<Vendor[]> {
    const { data } = await axios.get<Vendor[]>('/api/admin/vendors', {
        headers: getAuthHeaders(),
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
