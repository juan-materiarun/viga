import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Proxy request to Proxy Service (TCP Bridge)
        const response = await fetch('http://127.0.0.1:9222/json/list', { cache: 'no-store' });

        if (!response.ok) {
            throw new Error('Browserless not reachable');
        }

        const allSessions = await response.json();

        // Filter only actual Pages (exclude extensions, service workers) and sort by newest
        const sessions = allSessions
            .filter(s => s.type === 'page')
            .filter(s => s.url && !s.url.startsWith('devtools://')) // Optional: exclude internal pages
            .sort((a, b) => b.id.localeCompare(a.id)); // Higher ID usually means newer

        return NextResponse.json({
            success: true,
            sessions,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('[API/LIVE] Error fetching sessions:', error.message);
        return NextResponse.json({
            success: false,
            error: 'Docker Container not running or unreachable',
            details: error.message
        }, { status: 503 });
    }
}
