'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '@/lib/api/vendors';
import { vendorsKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { Vendor } from '@/types/vendor';

export function useDeleteVendorMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => vendorsApi.deleteVendor(id),
        onMutate: async (id) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: vendorsKeys.list() });

            // Snapshot the previous value
            const previousVendors = queryClient.getQueryData<Vendor[]>(vendorsKeys.list());

            // Optimistically remove from list
            if (previousVendors) {
                queryClient.setQueryData<Vendor[]>(
                    vendorsKeys.list(),
                    previousVendors.filter((v) => v.id !== id)
                );
            }

            return { previousVendors };
        },
        onError: (error: Error, _id, context) => {
            // Rollback on error
            if (context?.previousVendors) {
                queryClient.setQueryData(vendorsKeys.list(), context.previousVendors);
            }
            toast.error(error.message || 'Failed to delete vendor');
        },
        onSuccess: () => {
            // Invalidate list
            queryClient.invalidateQueries({ queryKey: vendorsKeys.list() });
            toast.success('Vendor deleted successfully');
        },
    });
}
