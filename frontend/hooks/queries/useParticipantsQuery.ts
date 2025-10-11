'use client';

import { useQuery } from '@tanstack/react-query';
import { participantsKeys } from '@/lib/queryKeys';
import { participantsApi } from '@/lib/api/participants';

export function useParticipantsQuery(slug: string) {
    return useQuery({
        queryKey: participantsKeys.byAuction(slug),
        queryFn: () => participantsApi.listParticipants(slug),
        enabled: !!slug,
    });
}
