import { chromium, Browser } from 'playwright';

export async function getBrowser(): Promise<Browser> {
    const browserlessWs = process.env.BROWSERLESS_WS;

    if (!browserlessWs) {
        console.log('⚠️ No BROWSERLESS_WS found. Launching local Chromium...');
        const localBrowser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized',
                '--remote-debugging-port=9222',
                '--remote-allow-origins=*'
            ]
        });
        return localBrowser;
    }

    try {
        console.log(`🔌 Connecting to Browserless (Isolated Connection)...`);
        let remoteBrowser: Browser;
        if (browserlessWs.includes('playwright')) {
            remoteBrowser = await chromium.connect(browserlessWs);
        } else {
            remoteBrowser = await chromium.connectOverCDP(browserlessWs);
        }
        console.log('✅ Connected to Browserless successfully');
        return remoteBrowser;
    } catch (e: any) {
        console.error('❌ Failed to connect to Browserless:', e.message);
        throw e;
    }
}

export async function closeBrowser() {
    // Isolated connections are closed by agents in their finally blocks.
}

export async function getBodyText(page: any): Promise<string> {
    try {
        return await page.evaluate(() => document.body.innerText);
    } catch (e) {
        return "";
    }
}
