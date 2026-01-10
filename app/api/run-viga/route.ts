import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  let browser;
  try {
    const { url, steps } = await request.json(); 
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    const screenshotFilename = `viga_${Date.now()}.png`;
    const screenshotPath = path.join(screenshotsDir, screenshotFilename);

    // --- ARGS AGREGADOS PARA FORZAR HEADLESS Y AHORRAR RECURSOS ---
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',           // Deshabilita aceleración gráfica (evita que se abra la ventana)
        '--no-first-run',
        '--no-zygote',
        '--single-process',        // Ahorra RAM
        '--hide-scrollbars',
        '--mute-audio'
      ]
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    
    const networkErrors: any[] = [];
    const consoleLogs: any[] = [];

    page.on('response', res => {
      if (res.status() >= 400) networkErrors.push({ url: res.url(), status: res.status() });
    });

    page.on('console', msg => {
      if (msg.type() === 'error') consoleLogs.push({ text: msg.text() });
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Mantenemos el timeout pero cambiamos a networkidle para más estabilidad
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Ejecución de pasos
    if (steps && Array.isArray(steps)) {
      for (const step of steps.sort((a, b) => a.step_order - b.step_order)) {
        try {
          if (step.action_type === 'type') {
            await page.fill(step.selector, "VIGA_E2E", { timeout: 8000 });
          } else {
            await page.click(step.selector, { timeout: 8000 });
          }
        } catch (error) {
          const healed = await page.evaluate((s) => {
            const el = Array.from(document.querySelectorAll('button, a, input, span'))
              .find(e => e.textContent?.trim() === s.expected_result?.trim());
            if (el) { el.setAttribute('data-viga', 'true'); return '[data-viga="true"]'; }
            return null;
          }, step);
          if (healed) await page.click(healed);
        }
        await page.waitForTimeout(1000); 
      }
    }

    await page.screenshot({ path: screenshotPath });
    const title = await page.title();
    await browser.close();

    // ANALISIS CON MODELO DE TEXTO (Llama 3.3 70B)
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are the VIGA QA Master. Analyze the technical logs and return ONLY JSON."
          },
          {
            role: "user",
            content: `Analyze this E2E run for ${url}. 
            Title: ${title}
            Network Errors: ${JSON.stringify(networkErrors)}
            Console Logs: ${JSON.stringify(consoleLogs)}
            
            Return JSON:
            {
              "criticalBugs": [],
              "functionalFailures": [],
              "visualAnomalies": []
            }`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    const groqResult = await groqResponse.json();
    
    if (!groqResult.choices) {
        throw new Error("Groq API Error: " + JSON.stringify(groqResult));
    }

    const report = JSON.parse(groqResult.choices[0].message.content);

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