import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Contexto por defecto si la suite no tiene uno específico
const DEFAULT_CONTEXT =
  "Eres VIGA, un QA Senior de una Startup. Tu misión es encontrar errores críticos, formularios que no validan y fallos de navegación.";

export async function POST(request: NextRequest) {
  let browser;
  try {
    const { url, steps, system_context, credentials } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Preparar directorio de evidencias
    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Lanzar navegador
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const browserContext = await browser.newContext();
    const page = await browserContext.newPage();

    const networkErrors: any[] = [];
    const consoleLogs: any[] = [];
    const stepResults: any[] = [];

    // Monitoreo de red
    page.on('response', res => {
      if (res.status() >= 400) {
        networkErrors.push({
          url: res.url(),
          status: res.status(),
          statusText: res.statusText()
        });
      }
    });

    // Monitoreo de consola
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    await page.setViewportSize({ width: 1280, height: 800 });

    // Entrada
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // --- CICLO DE EJECUCIÓN ---
    if (steps && steps.length > 0) {
      const orderedSteps = [...steps].sort(
        (a, b) => a.step_order - b.step_order
      );

      for (const step of orderedSteps) {
        const start = Date.now();
        try {
          let valueToFill = step.value;
          const selectorLower = step.selector.toLowerCase();

          if (step.action_type === 'type' || step.action_type === 'fill') {
            if (selectorLower.includes('email') || selectorLower.includes('user')) {
              valueToFill = credentials?.email || valueToFill;
            } else if (
              selectorLower.includes('pass') ||
              selectorLower.includes('key')
            ) {
              valueToFill = credentials?.password || valueToFill;
            }

            await page.waitForSelector(step.selector, { timeout: 8000 });
            await page.fill(step.selector, valueToFill);
          } else {
            await page.waitForSelector(step.selector, { timeout: 8000 });
            await page.click(step.selector);
          }

          await page.waitForTimeout(1500);

          stepResults.push({
            step: step.expected_result || step.selector,
            status: 'success',
            url: page.url(),
            duration: `${Date.now() - start}ms`
          });
        } catch (error: any) {
          // --- AUTO HEAL (TS SAFE) ---
          const healed = await page.evaluate((s) => {
            const targetText = (s.expected_result || "").toLowerCase();

            const elements = Array.from(
              document.querySelectorAll(
                'button, a, input[type="submit"], [role="button"]'
              )
            ) as HTMLElement[];

            const match = elements.find(el => {
              const text = el.innerText?.toLowerCase?.() || "";
              const value =
                (el as HTMLInputElement).value?.toLowerCase?.() || "";
              return text.includes(targetText) || value.includes(targetText);
            });

            if (match) {
              match.click();
              return true;
            }
            return false;
          }, step);

          stepResults.push({
            step: step.expected_result || step.selector,
            status: healed ? 'healed' : 'failed',
            error: healed ? null : `Target unreachable: ${error.message}`,
            autoHealed: healed
          });

          if (!healed) break;
        }
      }
    }

    // Screenshot final
    const finalScreenshotFilename = `viga_report_${Date.now()}.png`;
    const finalScreenshotPath = path.join(
      screenshotsDir,
      finalScreenshotFilename
    );

    await page.screenshot({
      path: finalScreenshotPath,
      fullPage: true
    });

    // --- IA AUDIT ---
    const analysisPrompt = {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Eres VIGA MASTER AI.
CONTEXTO DEL SISTEMA: ${system_context || DEFAULT_CONTEXT}
REGLA DE ORO: Si el objetivo era login/registro y la URL no cambió, es FAIL.
REGLA DE ORO: Errores 400 o 500 son CRÍTICOS.`
        },
        {
          role: "user",
          content: `Analiza esta misión:
- URL Inicial: ${url}
- URL Final: ${page.url()}
- Pasos: ${JSON.stringify(stepResults)}
- Errores de Red: ${JSON.stringify(networkErrors)}
- Consola: ${JSON.stringify(consoleLogs)}

Devuelve JSON:
{
  "verdict": "SUCCESS | FAILED | WARNING",
  "summary": "Resumen",
  "bugs": [],
  "score": 0-100
}`
        }
      ],
      response_format: { type: "json_object" }
    };

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(analysisPrompt)
      }
    );

    const groqData = await groqResponse.json();
    const finalAudit = JSON.parse(
      groqData.choices[0].message.content
    );

    await browser.close();

    return NextResponse.json({
      success: true,
      data: {
        screenshotPath: `/screenshots/${finalScreenshotFilename}`,
        executionSteps: stepResults,
        vigaMasterReport: finalAudit,
        technicalDetails: {
          networkErrors,
          consoleLogs
        }
      }
    });
  } catch (error: any) {
    if (browser) await browser.close();
    console.error("VIGA ENGINE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
