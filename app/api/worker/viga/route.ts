import { NextResponse } from 'next/server';
import { runReplayAgent } from '../../../actions/agents';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

async function handler(req: Request) {
    try {
        const { url, steps, suite_id } = await req.json();

        console.log(`[VIGA-REPLAY] 🎬 Action! ${url}`);

        // Await the replay agent so serverless doesn't kill it
        await runReplayAgent(url, suite_id, steps);

        return NextResponse.json({ success: true, message: 'Replay Completed' });
    } catch (error: any) {
        console.error('VIGA Worker Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const POST = verifySignatureAppRouter(handler);
