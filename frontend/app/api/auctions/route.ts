import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import type { AxiosResponse } from 'axios';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

function toNext(res: AxiosResponse<unknown>): NextResponse {
    const ct = res.headers['content-type'];
    const contentType = Array.isArray(ct) ? ct[0] : ct ?? 'application/json';
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    return new NextResponse(body, { status: res.status, headers: { 'content-type': contentType } });
}

export async function GET(): Promise<NextResponse> {
    const res = await api.get<unknown>('/admin/auctions', {
        headers: { 'x-admin-token': ADMIN_TOKEN },
        validateStatus: () => true,
    });
    return toNext(res);
}
