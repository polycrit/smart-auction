import { io, Socket } from 'socket.io-client';

export function connectAuctionSocket(slug: string, inviteToken?: string) {
    // Same origin in dev is fine; else point to API base URL
    const url = process.env.NEXT_PUBLIC_API_BASE_URL!;
    const socket: Socket = io(url + '/auction', {
        path: '/socket.io',
        transports: ['websocket'], // skip long-polling for speed
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        auth: { slug, t: inviteToken }, // passed to server's `auth`
    });
    return socket;
}
