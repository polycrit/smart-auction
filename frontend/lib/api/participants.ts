import { adminClient } from './client';

export type Participant = {
    id: string;
    join_url: string;
    invite_token: string;
    vendor: {
        id: string;
        name: string;
        email: string;
    };
};

export const participantsApi = {
    listParticipants: async (slug: string): Promise<Participant[]> => {
        const { data } = await adminClient.get<Participant[]>(`/auctions/${slug}/participants`);
        return data;
    },

    createParticipant: async (
        slug: string,
        payload: { vendor_id: string }
    ): Promise<Participant> => {
        const { data } = await adminClient.post<Participant>(
            `/auctions/${slug}/participants`,
            payload
        );
        return data;
    },

    deleteParticipant: async (slug: string, participantId: string): Promise<void> => {
        await adminClient.delete(`/auctions/${slug}/participants/${participantId}`);
    },
};
