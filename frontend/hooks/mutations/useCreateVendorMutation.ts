'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '@/lib/api/vendors';
import { vendorsKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { VendorCreate } from '@/types/vendor';

export function useCreateVendorMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: VendorCreate) => vendorsApi.createVendor(payload),
        onSuccess: () => {
            // Invalidate vendors list to refetch
            queryClient.invalidateQueries({ queryKey: vendorsKeys.list() });
            toast.success('Vendor created successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create vendor');
        },
    });
}
