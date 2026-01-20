import { chromium, Browser } from 'playwright';

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
    // Always force fresh connection to Browserless for each agent run
    // This ensures isolated WebSocket connections and prevents shared state issues
    if (browser) {
        if (browser.isConnected()) {
            return browser;
        }
        console.log('⚠️ Browser instance disconnected. Re-initializing...');
        try { await browser.close(); } catch { }
        browser = null;
    }

    const browserlessWs = process.env.BROWSERLESS_WS;

    if (!browserlessWs) {
        throw new Error('❌ Missing BROWSERLESS_WS environment variable');
    }

    try {
        console.log(`🔌 Connecting to Browserless...`);
        browser = await chromium.connectOverCDP(browserlessWs);
        console.log('✅ Connected to Browserless successfully');
    } catch (e: any) {
        console.error('❌ Failed to connect to Browserless:', e.message);
        throw e;
    }

    return browser;
}

export async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}
