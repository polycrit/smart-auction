'use client';

import { useQuery } from '@tanstack/react-query';
import { vendorsKeys } from '@/lib/queryKeys';
import { vendorsApi } from '@/lib/api/vendors';

export function useVendorQuery(id: string) {
    return useQuery({
        queryKey: vendorsKeys.detail(id),
        queryFn: () => vendorsApi.getVendor(id),
        enabled: !!id, // Only run query if ID is provided
    });
}
