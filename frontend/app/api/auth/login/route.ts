import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json();

        const res = await axios.post(`${API_BASE_URL}/auth/login`, body, {
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true,
        });

        return NextResponse.json(res.data, { status: res.status });
    } catch (error) {
        console.error('Login proxy error:', error);
        return NextResponse.json(
            { detail: 'Failed to connect to authentication server' },
            { status: 500 }
        );
    }
}
