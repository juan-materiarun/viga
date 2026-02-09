
import { chromium } from 'playwright';
import { WebSocket } from 'ws';

async function testConcurrency() {
    console.log('🧪 Testing Browserless Concurrency...');
    const wsEndpoint = 'ws://127.0.0.1:3001';

    try {
        // 1. Launch "Worker" Browser
        console.log('1. Launching Primary Browser (Worker Role)...');
        const browser = await chromium.connectOverCDP(wsEndpoint);
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('https://example.com');

        console.log('   ✅ Primary Browser Connected & Page Opened');

        // 2. Get the Page ID
        // We can get it via the target API or just asking browserless list
        // Let's use the internal page target ID logic
        // Actually, let's fetch the list like the frontend does

        await new Promise(r => setTimeout(r, 1000)); // Wait for list to update

        const fetch = (await import('node-fetch')).default;
        const res = await fetch('http://127.0.0.1:3001/json/list');
        const list = await res.json() as any[];
        const session = list.find((s: any) => s.type === 'page' && s.url.includes('example.com'));

        if (!session) {
            console.error('❌ Could not find session in /json/list');
            await browser.close();
            return;
        }

        console.log(`   📍 Found Session: ${session.id}`);
        console.log(`   🔗 Debug URL: ${session.webSocketDebuggerUrl}`);

        // 3. Attempt Secondary Connection (Live View Role)
        console.log('2. Attempting Secondary Connection (Live View Role)...');
        const secondaryWsUrl = session.webSocketDebuggerUrl.replace('localhost', '127.0.0.1').replace('3000', '3001');
        console.log(`   🔗 Connecting to: ${secondaryWsUrl}`);

        const ws = new WebSocket(secondaryWsUrl);

        await new Promise<void>((resolve, reject) => {
            ws.on('open', () => {
                console.log('   ✅ SUCCESS: Secondary WebSocket Connected! (Concurrency Allowed)');
                ws.close();
                resolve();
            });

            ws.on('error', (err) => {
                console.error(`   ❌ FAILED: WebSocket Error: ${err.message}`);
                resolve(); // resolving to continue cleanup
            });

            ws.on('close', (code, reason) => {
                console.log(`   Run ended. Socket closed: ${code} ${reason}`);
            });
        });

        console.log('3. Cleanup...');
        await browser.close();

    } catch (e) {
        console.error('💥 Error:', e);
    }
}

testConcurrency();
