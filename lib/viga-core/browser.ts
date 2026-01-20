import { chromium, Browser } from 'playwright'

let browser: Browser | null = null

export async function getBrowser(): Promise<Browser> {
  if (browser) {
    if (browser.isConnected()) {
      return browser
    }
    console.log('⚠️ Browser instance disconnected. Re-initializing...')
    try { await browser.close() } catch { }
    browser = null
  }

  const isVercel = !!process.env.VERCEL
  const browserlessUrl = process.env.BROWSERLESS_URL
  const browserlessToken = process.env.BROWSERLESS_TOKEN

  if (isVercel || browserlessUrl || browserlessToken) {
    console.log('🌐 Connecting to Remote Browser (Browserless)...')

    let endpoint = browserlessUrl
    if (!endpoint && browserlessToken) {
      endpoint = `wss://chrome.browserless.io?token=${browserlessToken}`
    }

    if (!endpoint) {
      throw new Error('❌ Missing Browserless Configuration: Set BROWSERLESS_URL or BROWSERLESS_TOKEN')
    }

    try {
      console.log(`🔌 Connecting to: ${endpoint.replace(/token=([^&]+)/, 'token=***')}`)
      browser = await chromium.connectOverCDP(endpoint)
      console.log('✅ Connected to Browserless successfully')
    } catch (e: any) {
      console.error('❌ Failed to connect to Browserless:', e.message)
      throw e
    }
  } else {
    console.log('🖥️ Using LOCAL Chromium')
    browser = await chromium.launch({
      headless: true
    })
  }

  return browser
}

export async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}
