import { NextResponse } from 'next/server';
import { Client } from "@upstash/qstash";
import { processVigaTransaction } from '../../../lib/billing';

const qstash = new Client({ token: process.env.QSTASH_TOKEN });

export async function POST(req: Request) {
    try {
        const { url, steps, suite_id, credentials, userId } = await req.json();

        if (!url || !steps || steps.length === 0) {
            return NextResponse.json({ success: false, error: 'URL and Steps required' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const billing = await processVigaTransaction(userId, 5, 'Regression Run'); // Cheaper than Agents
        if (!billing.success) {
            return NextResponse.json({ error: billing.error }, { status: 402 });
        }

        console.log(`[Replay] Triggering Regression for: ${url} (${steps.length} steps)`);

        // Publish to Worker
        const result = await qstash.publishJSON({
            url: `${process.env.NEXT_PUBLIC_APP_URL}/api/worker/viga`,
            body: { url, steps, suite_id, credentials },
        });

        return NextResponse.json({ success: true, message: 'Regression Queued', id: result.messageId });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
