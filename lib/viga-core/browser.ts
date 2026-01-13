import { chromium, Browser } from 'playwright'

let browser: Browser | null = null

export async function getBrowser(): Promise<Browser> {
  if (browser) return browser

  const isVercel = !!process.env.VERCEL
  const browserlessToken = process.env.BROWSERLESS_TOKEN

  if (isVercel && browserlessToken) {
    console.log('🌐 Using Browserless (Vercel)')
    browser = await chromium.connectOverCDP(
      `wss://chrome.browserless.io?token=${browserlessToken}`
    )
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
