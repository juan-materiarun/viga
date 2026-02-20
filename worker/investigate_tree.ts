
import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to a complex page to test the tree
    console.log('Navigating to example.com...');
    await page.setContent(`
    <html>
      <body>
        <header>
            <nav aria-label="Main">
                <a href="/">Home</a>
                <a href="/about">About</a>
            </nav>
        </header>
        <main>
            <h1>Welcome to VIGA</h1>
            <p>This is a test of the <strong>accessibility tree</strong>.</p>
            <form aria-label="Login">
                <label for="user">Username</label>
                <input id="user" type="text" placeholder="Enter user" />
                <button type="submit">Login</button>
            </form>
            <div aria-hidden="true">This should be hidden</div>
        </main>
        <footer>
            <p>&copy; 2026</p>
        </footer>
      </body>
    </html>
  `);

    console.log('Capturing accessibility snapshot...');
    const snapshot = await page.accessibility.snapshot();

    console.log('--- ACCESSIBILITY TREE ---');
    console.log(JSON.stringify(snapshot, null, 2));

    await browser.close();
})();
