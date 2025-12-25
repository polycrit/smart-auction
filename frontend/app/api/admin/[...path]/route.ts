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
    const searchParams = req.nextUrl.searchParams.toString();
    const url = `/admin/${path.join('/')}${searchParams ? `?${searchParams}` : ''}`;

    const methodHasBody = !['GET', 'DELETE'].includes(String(method).toUpperCase());
    const contentType = req.headers.get('content-type') ?? 'application/json';

    // Handle multipart form data (file uploads) differently
    const isMultipart = contentType.includes('multipart/form-data');
    let data: string | Buffer | undefined;
    let headers: Record<string, string> = { 'x-admin-token': ADMIN_TOKEN };

    if (methodHasBody) {
        if (isMultipart) {
            // For file uploads, pass the raw body and content-type header
            data = Buffer.from(await req.arrayBuffer());
            headers['content-type'] = contentType;
        } else {
            data = await req.text();
            headers['content-type'] = contentType;
        }
    }

    const res = await api.request<unknown>({
        url,
        method,
        headers,
        data,
        validateStatus: () => true,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
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
