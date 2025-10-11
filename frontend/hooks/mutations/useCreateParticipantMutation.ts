'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { participantsApi } from '@/lib/api/participants';
import { participantsKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

export function useCreateParticipantMutation(slug: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { vendor_id: string }) =>
            participantsApi.createParticipant(slug, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: participantsKeys.byAuction(slug) });
            toast.success('Participant created');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create participant');
        },
    });
}
