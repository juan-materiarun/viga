import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  let browser;
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // 1. Preparación de Entorno
    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    const screenshotFilename = `viga_${Date.now()}.png`;
    const screenshotPath = path.join(screenshotsDir, screenshotFilename);

    // 2. Ejecución de Playwright (The Beast)
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const networkErrors: any[] = [];
    const consoleLogs: any[] = [];
    const uncaughtExceptions: any[] = [];

    // Listeners técnicos
    page.on('response', res => {
      if (res.status() >= 400) {
        networkErrors.push({ url: res.url(), status: res.status(), type: res.request().resourceType() });
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') consoleLogs.push({ text: msg.text() });
    });

    page.on('pageerror', err => {
      uncaughtExceptions.push({ message: err.message });
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Análisis de Interactividad y Layout (Detección de elementos "muertos")
    const technicalInventory = await page.evaluate(() => {
      const all = document.querySelectorAll('button, a, input');
      const brokenElements = Array.from(all).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width === 0 || rect.height === 0;
      }).map(el => ({ tag: el.tagName, id: el.id, issue: 'Zero size / Hidden' }));

      return {
        totalElements: all.length,
        brokenElements: brokenElements.slice(0, 5)
      };
    });

    await page.screenshot({ path: screenshotPath, fullPage: true });
    const title = await page.title();
    const accessibilityTree = await page.accessibility.snapshot();

    // 3. Consolidación de Evidencia
    const technicalData = {
      networkErrors,
      consoleLogs,
      uncaughtExceptions,
      technicalInventory,
      accessibilityTree: JSON.stringify(accessibilityTree).substring(0, 2000) // Truncar para ahorrar tokens
    };

    await browser.close();

    // 4. IA Master Analysis (Unificamos para evitar 429)
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imageBase64 = fs.readFileSync(screenshotPath).toString('base64');

    const prompt = `
      System: You are the VIGA QA MASTER ENGINE. 
      Action: Analyze the technical data and screenshot provided.
      Role: Act as a Senior QA Automation Engineer.
      Constraint: Return ONLY JSON. No prose. No advice.
      
      Technical Data: ${JSON.stringify(technicalData)}

      Response Schema:
      {
        "criticalBugs": [{"selector": "string", "reason": "string", "severity": "CRITICAL"}],
        "functionalFailures": [{"description": "string", "evidence": "string"}],
        "visualAnomalies": [{"element": "string", "issue": "string"}]
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/png', data: imageBase64 } }
    ]);

    const report = JSON.parse(result.response.text().replace(/```json|```/g, ''));

    return NextResponse.json({
      success: true,
      data: {
        url,
        title,
        screenshotPath: `/screenshots/${screenshotFilename}`,
        vigaMasterReport: report
      }
    });

  } catch (error: any) {
    if (browser) await browser.close();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}