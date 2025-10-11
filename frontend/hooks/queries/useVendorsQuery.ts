'use client';

import { useQuery } from '@tanstack/react-query';
import { vendorsKeys } from '@/lib/queryKeys';
import { vendorsApi } from '@/lib/api/vendors';

export function useVendorsQuery() {
    return useQuery({
        queryKey: vendorsKeys.list(),
        queryFn: () => vendorsApi.listVendors(),
        staleTime: 30_000, // Consider data fresh for 30 seconds
    });
}
