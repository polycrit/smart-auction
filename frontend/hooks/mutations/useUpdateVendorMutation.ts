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
            await queryClient.cancelQueries({ queryKey: vendorsKeys.detail(id) });

            const previousVendor = queryClient.getQueryData<Vendor>(vendorsKeys.detail(id));

            if (previousVendor) {
                queryClient.setQueryData<Vendor>(vendorsKeys.detail(id), {
                    ...previousVendor,
                    ...newVendor,
                });
            }

            return { previousVendor };
        },
        onError: (error: Error, _newVendor, context) => {
            if (context?.previousVendor) {
                queryClient.setQueryData(vendorsKeys.detail(id), context.previousVendor);
            }
            toast.error(error.message || 'Failed to update vendor');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorsKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: vendorsKeys.list() });
            toast.success('Vendor updated successfully');
        },
    });
}
