
const { chromium } = require('playwright');

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.setContent(`<html><body><button>Test</button></body></html>`);

        // Check for accessibility property
        if (page.accessibility) {
            console.log('ACCESSIBILITY FOUND!');
            const snapshot = await page.accessibility.snapshot();
            console.log(JSON.stringify(snapshot));
        } else {
            console.log('Accessibility mixin missing. Trying CDP...');
            const client = await context.newCDPSession(page);
            const { nodes } = await client.send('Accessibility.getFullAXTree');
            console.log('CDP SUCCESS. Nodes count:', nodes.length);
            console.log(JSON.stringify(nodes[0], null, 2)); // Log root
        }

        await browser.close();
    } catch (e) {
        console.error('ERROR:', e);
    }
})();
