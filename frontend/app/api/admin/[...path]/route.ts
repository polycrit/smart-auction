import { NextRequest, NextResponse } from 'next/server';
import { apiClient as api } from '@/lib/api/client';
import type { AxiosResponse, Method } from 'axios';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

type AdminParams = Promise<{ path: string[] }>;

function toNextResponse(res: AxiosResponse<unknown>): NextResponse {
    const ct = res.headers['content-type'];
    const contentType = Array.isArray(ct) ? ct[0] : ct ?? 'application/json';
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    return new NextResponse(body, { status: res.status, headers: { 'content-type': contentType } });
}

async function forward(method: Method, req: NextRequest, paramsPromise: AdminParams): Promise<NextResponse> {
    const { path } = await paramsPromise; // <-- await params
    const url = `/admin/${path.join('/')}`;

    const methodHasBody = !['GET', 'DELETE'].includes(String(method).toUpperCase());
    const data = methodHasBody ? await req.text() : undefined;

    const contentType = req.headers.get('content-type') ?? 'application/json';
    const res = await api.request<unknown>({
        url,
        method,
        headers: { 'x-admin-token': ADMIN_TOKEN, 'content-type': contentType },
        data,
        validateStatus: () => true,
    });

    return toNextResponse(res);
}

export function GET(req: NextRequest, ctx: { params: AdminParams }): Promise<NextResponse> {
    return forward('GET', req, ctx.params);
}
export function POST(req: NextRequest, ctx: { params: AdminParams }): Promise<NextResponse> {
    return forward('POST', req, ctx.params);
}
export function PUT(req: NextRequest, ctx: { params: AdminParams }): Promise<NextResponse> {
    return forward('PUT', req, ctx.params);
}
export function PATCH(req: NextRequest, ctx: { params: AdminParams }): Promise<NextResponse> {
    return forward('PATCH', req, ctx.params);
}
export function DELETE(req: NextRequest, ctx: { params: AdminParams }): Promise<NextResponse> {
    return forward('DELETE', req, ctx.params);
}
