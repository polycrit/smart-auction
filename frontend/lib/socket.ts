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
        extraHeaders: {
            'ngrok-skip-browser-warning': 'true',
        },
    });
    return socket;
}

export function connectAdminSocket(token: string) {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL!;
    const socket: Socket = io(url + '/admin', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        auth: { token },
        extraHeaders: {
            'ngrok-skip-browser-warning': 'true',
        },
    });
    return socket;
}

/** Get admin JWT token from localStorage */
export function getAdminToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_token');
}
