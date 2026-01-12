'use server';

import { chromium } from 'playwright';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

/* ------------------ CLIENTES ------------------ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ------------------ UTILIDADES ------------------ */

async function stableScreenshot(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(600);
  return page.screenshot({ type: 'jpeg', quality: 80 });
}

async function uploadEvidence(page, suiteId, step) {
  try {
    const buffer = await stableScreenshot(page);
    const path = `${suiteId}/${Date.now()}-${step}.jpg`;

    await supabase.storage
      .from('viga-evidence')
      .upload(path, buffer, { contentType: 'image/jpeg' });

    const { data } = supabase.storage
      .from('viga-evidence')
      .getPublicUrl(path);

    return data.publicUrl;
  } catch {
    return null;
  }
}

async function reportStep(
  suiteId,
  title,
  description,
  status,
  agent,
  screenshot = null
) {
  console.log(`[LOG-STEP] ${status.toUpperCase()} | ${title}`);

  await supabase.from('test_steps').insert([
    {
      suite_id: suiteId,
      action_type: agent,
      selector: title,
      expected_result: description,
      status,
      screenshot_url: screenshot
    }
  ]);
}

/* ------------------ VISIÓN ------------------ */

async function getVisualContext(page, goal) {
  const img = await stableScreenshot(page);
  const base64 = img.toString('base64');

  const res = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `
Describe la pantalla actual.
Objetivo: "${goal}"
Indica:
- Qué se ve
- Si hay bloqueos
- Estado general (inicio, resultados, detalle, error)
`
          },
          {
            type: 'input_image',
            image_url: `data:image/jpeg;base64,${base64}`
          }
        ]
      }
    ]
  });

  return res.output_text || '';
}

/* ------------------ VERIFICADOR ------------------ */

async function verifyGoal({ goal, beforeDOM, afterDOM, visual }) {
  if (!goal) return false;

  if (beforeDOM !== afterDOM) return true;

  if (afterDOM.toLowerCase().includes(goal.toLowerCase())) return true;

  if (
    visual.toLowerCase().includes('resultado') ||
    visual.toLowerCase().includes('detalle') ||
    visual.toLowerCase().includes('confirmación')
  ) {
    return true;
  }

  return false;
}

/* ------------------ AGENTE ------------------ */

async function startAgent(page, suiteId, goal, apiKey) {
  let prevDOM = '';
  const maxSteps = 8;

  for (let i = 0; i < maxSteps; i++) {
    console.log(`\n--- ITERACIÓN ${i + 1} ---`);

    const visual = await getVisualContext(page, goal);
    console.log('[VISIÓN]', visual);

    const snapshot = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('a,button,input,[role="button"]')
      )
        .map((el, i) => ({
          index: i,
          text: (el.innerText || el.placeholder || '').slice(0, 40)
        }))
        .filter(e => e.text);
    });

    const decision = await callAI({
      apiKey,
      systemPrompt: `
Eres un agente QA.
Objetivo: "${goal}"
Responde SOLO JSON:
{"index": number, "action": "click|type", "value": "string"}
`,
      userContent: JSON.stringify(snapshot)
    });

    const stepImg = await uploadEvidence(page, suiteId, `step_${i}`);

    await page.evaluate(({ index, action, value }) => {
      const els = Array.from(
        document.querySelectorAll('a,button,input,[role="button"]')
      );
      const el = els[index];
      if (!el) return;

      el.scrollIntoView({ block: 'center' });

      if (action === 'type') {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        el.click();
      }
    }, decision);

    await page.waitForTimeout(2000);

    const afterDOM = await page.content();

    const achieved = await verifyGoal({
      goal,
      beforeDOM: prevDOM,
      afterDOM,
      visual
    });

    await reportStep(
      suiteId,
      decision.action.toUpperCase(),
      decision.value || decision.action,
      'success',
      'striker',
      stepImg
    );

    if (achieved) {
      await reportStep(
        suiteId,
        'OBJETIVO',
        'Verificado por sistema',
        'success',
        'system',
        stepImg
      );
      break;
    }

    prevDOM = afterDOM;
  }
}

/* ------------------ ENTRY ------------------ */

export async function runChaosEvolution(url, suiteId, config = {}) {
  const {
    mode = 'chaos',
    goal = '',
    apiKeys = []
  } = config;

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();

  await reportStep(suiteId, 'INICIO', `Modo: ${mode}`, 'success', 'system');
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await startAgent(page, suiteId, goal, apiKeys[0]);

  await browser.close();
}

/* ------------------ LLM ------------------ */

async function callAI({ systemPrompt, userContent, apiKey }) {
  const groq = new Groq({ apiKey });

  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ]
  });

  return JSON.parse(res.choices[0].message.content);
}
