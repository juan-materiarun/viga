
import { WebSocket, WebSocketServer } from 'ws';

export const dynamic = 'force-dynamic';

const wss = new WebSocketServer({ noServer: true });

export async function GET(req) {
    if (req.headers.get('upgrade') !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const url = new URL(req.url);
    const targetId = url.searchParams.get('target');

    if (!targetId) {
        return new Response('Missing target param', { status: 400 });
    }

    // Connect to Browserless securely from the server side
    // Internal Docker URL usually: ws://127.0.0.1:3001
    // We can use the docker service name 'browserless' if we were inside docker, 
    // but here we are localhost relative to the worker.

    // NOTE: The targetId we get from frontend is usually just the ID part 
    // or the full path /devtools/page/ID.
    // We construct the internal URL manually.

    let internalWsUrl = `ws://127.0.0.1:3001/devtools/page/${targetId}`;

    // Upgrade the incoming request to a WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req);
    // Wait, Next.js App Router doesn't support easy WS upgrade like this in standard Node runtime easily 
    // without a custom server.

    // ALTERNATIVE STRATEGY:
    // Since we can't easily make a WS proxy in Next.js App Router API without a custom server...
    // We will use the 'ws' library compatible approach if possible, or...

    // Actually, looking at the user stack, they use 'npm run dev' which is 'next dev'.
    // Next.js API Routes (Pages router) are easier for WS, but App Router Route Handlers are tricky.

    // Let's TRY to use a simple "TCP Proxy" approach or just fallback to the current approach 
    // BUT fix the Docker check.

    // Wait, if the user is willing to run a small proxy server in the worker?

    return new Response('Not implemented in App Router yet', { status: 501 });
}
