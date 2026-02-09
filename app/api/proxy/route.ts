import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { method, url, headers, body } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
        }

        const start = Date.now();
        const response = await fetch(url, {
            method,
            headers: headers || {},
            body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
        });
        const duration = Date.now() - start;

        const data = await response.text();
        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch {
            jsonData = data; // Keep as text if not JSON
        }

        return NextResponse.json({
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: jsonData,
            duration,
            size: data.length
        });

    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            status: 500,
            duration: 0
        }, { status: 500 });
    }
}
