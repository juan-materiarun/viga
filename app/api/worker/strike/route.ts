import { NextResponse } from 'next/server';
import { runStrikeAgent } from '../../../actions/agents';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function handler(req: Request) {
    try {
        const body = await req.json();
        const { url, suite_id, goal } = body;

        if (!url || !suite_id || !goal) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        console.log(`[VIGA-STRIKE-WORKER] 🎯 Strike initiated: ${goal}`);

        // Await execution to ensure completion in serverless env
        await runStrikeAgent(url, suite_id, goal);

        console.log(`[VIGA-STRIKE-WORKER] ✅ Strike finished: ${suite_id}`);

        return NextResponse.json({
            success: true,
            message: "Strike execution finished"
        });

    } catch (err: any) {
        console.error("[VIGA-STRIKE-WORKER-ERROR]:", err);
        return NextResponse.json({
            success: false,
            error: err.message
        }, { status: 500 });
    }
}

export const POST = verifySignatureAppRouter(handler);
