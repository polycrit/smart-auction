import { adminClient } from './client';
import type { Vendor, VendorCreate } from '@/types/vendor';

export const vendorsApi = {
    listVendors: async (): Promise<Vendor[]> => {
        const { data } = await adminClient.get<Vendor[]>('/vendors');
        return data;
    },

    getVendor: async (id: string): Promise<Vendor> => {
        const { data} = await adminClient.get<Vendor>(`/vendors/${id}`);
        return data;
    },

    createVendor: async (payload: VendorCreate): Promise<Vendor> => {
        const { data } = await adminClient.post<Vendor>('/vendors', payload);
        return data;
    },

    updateVendor: async (id: string, payload: VendorCreate): Promise<Vendor> => {
        const { data } = await adminClient.put<Vendor>(`/vendors/${id}`, payload);
        return data;
    },

    deleteVendor: async (id: string): Promise<void> => {
        await adminClient.delete(`/vendors/${id}`);
    },
};
