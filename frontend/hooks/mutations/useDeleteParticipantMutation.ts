'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { participantsApi, type Participant } from '@/lib/api/participants';
import { participantsKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

export function useDeleteParticipantMutation(slug: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (participantId: string) =>
            participantsApi.deleteParticipant(slug, participantId),
        onMutate: async (participantId) => {
            await queryClient.cancelQueries({ queryKey: participantsKeys.byAuction(slug) });

            const previousParticipants = queryClient.getQueryData<Participant[]>(
                participantsKeys.byAuction(slug)
            );

            if (previousParticipants) {
                queryClient.setQueryData<Participant[]>(
                    participantsKeys.byAuction(slug),
                    previousParticipants.filter((p) => p.id !== participantId)
                );
            }

            return { previousParticipants };
        },
        onError: (error: any, _participantId, context) => {
            if (context?.previousParticipants) {
                queryClient.setQueryData(
                    participantsKeys.byAuction(slug),
                    context.previousParticipants
                );
            }
            toast.error(error.message || 'Failed to delete participant');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: participantsKeys.byAuction(slug) });
            toast.success('Participant deleted');
        },
    });
}
