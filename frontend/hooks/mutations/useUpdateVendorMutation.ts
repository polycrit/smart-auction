'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '@/lib/api/vendors';
import { vendorsKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { VendorCreate, Vendor } from '@/types/vendor';

export function useUpdateVendorMutation(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: VendorCreate) => vendorsApi.updateVendor(id, payload),
        onMutate: async (newVendor) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: vendorsKeys.detail(id) });

            // Snapshot the previous value
            const previousVendor = queryClient.getQueryData<Vendor>(vendorsKeys.detail(id));

            // Optimistically update to the new value
            if (previousVendor) {
                queryClient.setQueryData<Vendor>(vendorsKeys.detail(id), {
                    ...previousVendor,
                    ...newVendor,
                });
            }

            return { previousVendor };
        },
        onError: (error: Error, _newVendor, context) => {
            // Rollback to the previous value on error
            if (context?.previousVendor) {
                queryClient.setQueryData(vendorsKeys.detail(id), context.previousVendor);
            }
            toast.error(error.message || 'Failed to update vendor');
        },
        onSuccess: () => {
            // Invalidate both detail and list
            queryClient.invalidateQueries({ queryKey: vendorsKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: vendorsKeys.list() });
            toast.success('Vendor updated successfully');
        },
    });
}
