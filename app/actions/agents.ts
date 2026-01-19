'use server'

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { getBrowser } from '../../lib/viga-core/browser'
import { captureEvidence } from '../../lib/viga-core/evidence'
import { callGroqJSON, createLLMContext } from '../../lib/viga-core/llm'

/* ───────── SETUP ───────── */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/* ───────── LOGGING & STEPS ───────── */

// Log textual updates to agent_logs
async function vigaLog(
  suiteId: string,
  message: string,
  level: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  const shortId = suiteId.slice(-4)
  console.log(`[${shortId}] ${message}`)
  await supabase.from('agent_logs').insert({
    suite_id: suiteId,
    message,
    level
  })
}

// Record visual steps to test_steps (DB + Storage)
async function recordStep(
  suiteId: string,
  page: any,
  title: string,
  status: 'success' | 'failed' | 'running' | 'warning',
  description: string = ''
) {
  const stepId = crypto.randomUUID()
  // Capture screenshot & DOM
  const evidence = await captureEvidence(page, suiteId, stepId, false)

  // Insert into DB for Frontend to see
  const { error } = await supabase.from('test_steps').insert({
    id: stepId,
    suite_id: suiteId,
    title: title, // Main visible text in UI (The Thought)
    expected_result: description, // Subtext (The Action)
    status: status,
    screenshot_url: evidence.screenshotUrl
  })

  if (error) console.error('Error saving step:', error)
}

/* ───────── UI STABILITY ───────── */

async function waitForStableUI(page: any, timeout = 15000) {
  const start = Date.now()
  let stableCount = 0

  while (Date.now() - start < timeout) {
    const unstable = await page.evaluate(() => {
      // 1. Check Loaders
      const hasLoader =
        document.querySelector(
          '.loader, .spinner, .loading, [aria-busy="true"], .MuiCircularProgress-root, [data-loading="true"]'
        ) !== null

      // 2. Check Text Loading
      const textLoading = document.body.innerText
        .toLowerCase()
        .match(/cargando\.\.\.|loading\.\.\.|procesando\.\.\./)

      // 3. Animation checks (heuristic)
      return hasLoader || !!textLoading
    })

    if (!unstable) {
      stableCount++
      if (stableCount > 2) return // Require 3 clean checks
    } else {
      stableCount = 0
    }
    await sleep(300)
  }
}

/* ───────── DOM & SELECTORS ───────── */

// Helper to generate robust selectors in the browser context
const CLIENT_SELECTOR_SCRIPT = `
  (function() {
    function getCssPath(element) {
      if (element.id !== '') return '#' + element.id;
      if (element === document.body) return element.tagName.toLowerCase();
      
      var ix = 0;
      var siblings = element.parentNode.childNodes;
      for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];
        if (sibling === element) return getCssPath(element.parentNode) + ' > ' + element.tagName.toLowerCase() + ':nth-of-type(' + (ix + 1) + ')';
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
      }
      return null;
    }

    function getXPath(element) {
      if (element.id !== '') return '//*[@id="' + element.id + '"]';
      if (element === document.body) return '/html/body';
      
      var ix = 0;
      var siblings = element.parentNode.childNodes;
      for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];
        if (sibling === element) return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
      }
      return null;
    }

    window.getVigaSelector = getCssPath;
    window.getVigaXPath = getXPath;
  })();
`

async function injectScripts(page: any) {
  await page.addScriptTag({ content: CLIENT_SELECTOR_SCRIPT })
}

/* ───────── UI STATE ───────── */

async function getUIState(page: any) {
  return await page.evaluate(() => {
    return {
      url: location.href,
      title: document.title
    }
  })
}

/* ───────── ELEMENT SCAN ───────── */

type UIElement = {
  i: number
  tag: string
  text: string
  hint: string
  selector: string
  xpath: string
  attributes?: any
}

async function getActiveElements(page: any): Promise<UIElement[]> {
  await injectScripts(page)

  return await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll(
        'a, button, input, select, textarea, [role="button"], [tabindex="0"]'
      )
    )
      .map((e, i) => {
        const el = e as HTMLElement // Explicit cast
        const r = el.getBoundingClientRect()

        // Visibility Check & Enabled Check
        const style = window.getComputedStyle(el)
        if (
          r.width < 5 ||
          r.height < 5 ||
          style.visibility === 'hidden' ||
          // style.display === 'none' || // Browsers handle this in visibility
          el.hasAttribute('disabled') ||
          el.getAttribute('aria-disabled') === 'true' ||
          el.closest('[disabled]') // Parent disabled check
        ) return null

        // Safe attributes
        const placeholder = el.getAttribute('placeholder') || ''
        const aria = el.getAttribute('aria-label') || ''
        const name = el.getAttribute('name') || ''
        const role = el.getAttribute('role') || ''
        const type = el.getAttribute('type') || ''

        // Find label
        let labelText = ''
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`) as HTMLElement
          if (label) labelText = label.innerText || label.textContent || ''
        }
        if (!labelText && el.closest('label')) {
          const label = el.closest('label') as HTMLElement
          labelText = label?.innerText || label?.textContent || ''
        }

        // Generate Selector
        // @ts-ignore
        let selector = window.getVigaSelector(el)
        // @ts-ignore
        const xpath = window.getVigaXPath(el)

        // Refine selector if simple ID/Name exists
        if (el.id) selector = `#${el.id}`
        else if (name) selector = `${el.tagName.toLowerCase()}[name="${name}"]`

        const cleanText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100)

        // Semantic Hint for AI
        const hint = [labelText, placeholder, aria, name, role, cleanText].filter(Boolean).join(' | ')

        return {
          i,
          tag: el.tagName.toLowerCase(),
          text: cleanText,
          hint: hint,
          selector,
          xpath,
          attributes: { type, name, id: el.id }
        }
      })
      .filter(Boolean) as UIElement[]
  })
}

// Wrapper to retry if 0 elements found (resilience)
async function getSafeActiveElements(page: any, retries = 5): Promise<UIElement[]> {
  for (let i = 0; i < retries; i++) {
    const elements = await getActiveElements(page)
    if (elements.length > 0) return elements
    await sleep(2000) // Increase wait to 2s per retry (Total 10s)
  }
  return []
}

/* ───────── SCOUT AGENT ───────── */

export async function runScoutAgent(url: string, suiteId: string) {
  const browser = await getBrowser()
  const page = await browser.newPage()

  await vigaLog(suiteId, '🔍 Scout iniciado', 'info')

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }) } catch (e) { }
    await waitForStableUI(page)
    await injectScripts(page)

    // Get all elements with the improved scanner
    const elements = await getSafeActiveElements(page)

    await vigaLog(suiteId, `👀 Encontrados ${elements.length} elementos interactivos`, 'info')

    let inserted = 0
    const batchSize = 10

    // Process in chunks to avoid blocking
    for (let i = 0; i < elements.length; i += batchSize) {
      const chunk = elements.slice(i, i + batchSize)

      for (const el of chunk) {
        const { error } = await supabase.from('discovered_elements').upsert({
          suite_id: suiteId,
          selector: el.selector, // Ideally store xpath too if schema allowed, but selector is primary
          tag_name: el.tag,
          text: el.text || el.hint,
          url: url,
          status: 'active',
          priority: 1,
          // Additional metadata
          identity_data: {
            hint: el.hint,
            attributes: el.attributes,
            xpath: el.xpath // Store xpath in JSONB
          }
        }, { onConflict: 'suite_id, selector' })

        if (!error) inserted++
      }
    }

    await vigaLog(
      suiteId,
      `📦 Scout DB: ${inserted} elementos registrados/actualizados`,
      'success'
    )
  } catch (e: any) {
    console.error(e)
    await vigaLog(suiteId, `❌ Scout Error: ${e.message}`, 'error')
    throw e
  } finally {
    await page.close()
  }
}

/* ───────── CHAOS AGENT ───────── */

const CHAOS_SYSTEM = `
Eres un Tester de Chaos Inteligente y Universal.
Tu objetivo es explorar la MAYOR cantidad de funcionalidades ÚNICAS posibles.

Reglas de Oro:
1. **PRIORIDAD MÁXIMA**: Interactúa con elementos que tengan "visited": false.
2. **NO REPETIR**: Si un elemento ya fue visitado ("visited": true), IGNÓRALO a menos que sea crucial para navegar (ej: 'Siguiente').
3. **FINISH**: Si TODOS los elementos visibles ya están visitados ("visited": true) y no hay nada nuevo que hacer, responde con action: "finish".
4. **Contexto**: Lee los "hints". Si pide URL, pon una válida.
5. **Variedad**: Prueba distintos caminos.

Recibes:
- Estado actual (URL, título).
- Elementos interactivos (con estado 'visited').
- **Historial**: Acciones recientes.

Responde SOLO JSON:
{
  "thought": "Título breve (ej: 'Probando botón X' o 'Todo explorado, finalizando')",
  "index": number (opcional si finish),
  "action": "click" | "type" | "finish",
  "payload": "string" (solo para type)
}
`

export async function runChaosAgent(url: string, suiteId: string) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const llmCtx = createLLMContext()

  await vigaLog(suiteId, '🌪️ Chaos Monkey Liberado', 'info')

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }) } catch (e) { }

    let actions = 0
    const MAX_ACTIONS = 20
    const visitedStates = new Set<string>()
    const visitedFingerprints = new Set<string>() // Track interacted elements
    const history: string[] = []

    while (actions < MAX_ACTIONS) {
      await waitForStableUI(page)

      const elements = await getSafeActiveElements(page) // Waits up to 10s
      const currentUrl = page.url()

      if (elements.length === 0) {
        // Smart Polling Logic for Slow Pages (up to 60s)
        await vigaLog(suiteId, '⚠️ Página vacía. Iniciando "Espera Profunda" (hasta 60s)...', 'warning')

        const POLL_MAX = 60000
        const POLL_INTERVAL = 2000
        let waited = 0
        let found = false

        while (waited < POLL_MAX) {
          await sleep(POLL_INTERVAL)
          waited += POLL_INTERVAL

          const currentUrlCheck = page.url()
          if (currentUrlCheck !== currentUrl) {
            await vigaLog(suiteId, `🔄 Navegación detectada: ${currentUrlCheck}`, 'info')
            found = true // Break to let main loop handle new URL
            break
          }

          // @ts-ignore
          const retryElements = await getActiveElements(page)
          if (retryElements.length > 0) {
            // @ts-ignore
            elements.push(...retryElements)
            found = true
            await vigaLog(suiteId, `👀 Elementos aparecieron tras ${waited / 1000}s!`, 'success')
            break
          }

          if (waited % 10000 === 0) {
            await vigaLog(suiteId, `⏳ Esperando carga... (${waited / 1000}s)`, 'info')
          }
        }

        if (!found) {
          await vigaLog(suiteId, `🛑 Tiempo agotado (${POLL_MAX / 1000}s). Página inactiva.`, 'error')
          // CAPTURE FAILURE EVIDENCE
          await recordStep(suiteId, page, 'Falló: Timeout (60s)', 'failed', 'La página no mostró elementos interactivos tras 60 segundos de espera profunda.')
          break
        }
      }

      const stateHash = crypto.createHash('md5').update(currentUrl + elements.length).digest('hex')
      if (!visitedStates.has(stateHash)) {
        visitedStates.add(stateHash)
        await vigaLog(suiteId, `📍 Nuevo estado: ${currentUrl} (${elements.length} elems)`, 'info')
      }

      // MARK VISITED ELEMENTS
      const mappedElements = elements.map(e => {
        const fingerprint = `${currentUrl}::${e.hint}::${e.tag}` // Unique ID for visual element
        return {
          i: e.i,
          tag: e.tag,
          hint: e.hint,
          visited: visitedFingerprints.has(fingerprint)
        }
      })

      // Count unvisited to help AI decide termination
      const unvisitedCount = mappedElements.filter(e => !e.visited).length

      const context = JSON.stringify({
        url: currentUrl,
        title: await page.title(),
        history: history.slice(-15),
        interactive_elements: mappedElements,
        stats: { unvisited_elements: unvisitedCount }
      })

      const decision = await callGroqJSON(llmCtx, CHAOS_SYSTEM, context)

      if (!decision) {
        console.warn('[CHAOS] Invalid LLM decision', decision)
        break
      }

      // HANDLE FINISH
      if (decision.action === 'finish') {
        await vigaLog(suiteId, '✅ Chaos: Cobertura completada.', 'success')
        await recordStep(suiteId, page, 'Exploración Finalizada', 'success', decision.thought || 'No hay más elementos nuevos que probar.')
        break
      }

      if (typeof decision.index !== 'number') break

      const target = elements.find(e => e.i === decision.index)

      if (target) {
        const fingerprint = `${currentUrl}::${target.hint}::${target.tag}`
        const actionDesc = `${decision.action} en "${target.hint}" (payload: ${decision.payload || 'N/A'})`
        await vigaLog(suiteId, `👉 [${actions + 1}/${MAX_ACTIONS}] ${actionDesc}`, 'info')

        history.push(`${decision.thought} (${actionDesc})`)

        try {
          if (decision.action === 'type') {
            try {
              await page.fill(target.selector, decision.payload || 'Test Value')
            } catch (e) {
              if (target.xpath) await page.fill(`xpath=${target.xpath}`, decision.payload || 'Test Value')
              else throw e
            }
          } else {
            try {
              await page.click(target.selector, { timeout: 5000 })
            } catch (e) {
              if (target.xpath) await page.click(`xpath=${target.xpath}`, { timeout: 5000 })
              else throw e
            }
          }

          visitedFingerprints.add(fingerprint) // MARK AS VISITED
          actions++

          await sleep(3000) // WAIT FOR ANIMATION (Snapshot delay)

          await recordStep(suiteId, page, decision.thought || actionDesc, 'success', actionDesc)

        } catch (err: any) {
          await vigaLog(suiteId, `⚠️ Fallo acción: ${err.message}`, 'warning')
          await recordStep(suiteId, page, `Error: ${decision.thought}`, 'failed', `${actionDesc} -> ${err.message}`)
        }
      } else {
        await vigaLog(suiteId, '⚠️ AI alucinó índice, escogiendo aleatorio...', 'warning')
        const random = elements[Math.floor(Math.random() * elements.length)]
        try { await page.click(random.selector, { timeout: 2000 }) } catch (e) { }
      }

      await sleep(1000)
    }

    await vigaLog(suiteId, '🏁 Chaos Session Finalizada', 'success')
  } catch (e: any) {
    await vigaLog(suiteId, `☠️ Chaos Crashed: ${e.message}`, 'error')
    throw e
  } finally {
    await page.close()
  }
}

/* ───────── STRIKE AGENT (REACT LOOP) ───────── */

const STRIKE_SYSTEM = `
Eres un Agente Autónomo Web (ReAct).
Tu misión: Cumplir el objetivo del usuario.
Recibes el estado actual de la página y una lista de elementos.

Instrucciones:
1. Analiza el estado actual y si te acerca al objetivo.
2. Si el objetivo está cumplido, responde con action: "finish".
3. Si necesitas más información, responde con action: "scroll" o "wait".
4. Para interactuar, elige el índice (index) del elemento más prometedor.

Responde SOLO en JSON:
{
  "thought": "Razonamiento paso a paso...",
  "status": "active" | "completed" | "failed",
  "action": "click" | "type" | "wait" | "finish",
  "index": number (opcional),
  "payload": "texto" (solo para type)
}
`

export async function runStrikeAgent(url: string, suiteId: string, goal: string) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const llmCtx = createLLMContext()

  await vigaLog(suiteId, `🎯 Operación Strike: ${goal}`, 'info')

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }) } catch (e) { }

    let steps = 0
    const MAX_STEPS = 20

    while (steps < MAX_STEPS) {
      await waitForStableUI(page)
      const elements = await getSafeActiveElements(page)

      // Context
      const context = JSON.stringify({
        objective: goal,
        current_url: page.url(),
        page_title: await page.title(),
        visible_elements: elements.map(e => ({ i: e.i, tag: e.tag, hint: e.hint }))
      })

      const plan = await callGroqJSON(llmCtx, STRIKE_SYSTEM, context)

      if (!plan) {
        await vigaLog(suiteId, '🧠 Brain Freeze (LLM no respondió)', 'error')
        break
      }

      await vigaLog(suiteId, `🤔 (${steps + 1}) ${plan.thought}`, 'info')

      if (plan.status === 'completed' || plan.action === 'finish') {
        await vigaLog(suiteId, '✅ Objetivo Cumplido', 'success')
        await recordStep(suiteId, page, 'Objetivo Cumplido', 'success', plan.thought)
        break
      }

      if (plan.status === 'failed') {
        await vigaLog(suiteId, '❌ El agente se rinde', 'error')
        await recordStep(suiteId, page, 'Misión Fallida', 'failed', plan.thought)
        break
      }

      // Execute Action
      steps++
      try {
        if (plan.action === 'wait') {
          await sleep(2000)
        } else if (plan.index !== undefined) {
          const target = elements.find(e => e.i === plan.index)
          if (target) {
            // Try CSS then XPath
            if (plan.action === 'type') {
              try {
                await page.fill(target.selector, plan.payload || '')
              } catch (e) {
                if (target.xpath) await page.fill(`xpath=${target.xpath}`, plan.payload || '')
                else throw e
              }
            } else {
              try {
                await page.click(target.selector, { timeout: 5000 })
              } catch (e) {
                if (target.xpath) await page.click(`xpath=${target.xpath}`, { timeout: 5000 })
                else throw e
              }
            }

            // Wait for reaction
            await sleep(3000)

            // Capture after action
            await recordStep(suiteId, page, plan.thought, 'success', `${plan.action} ${target.hint}`)
          } else {
            // Retry scan if element missing (caused by stale state)
            await vigaLog(suiteId, '⚠️ Elemento perdido, re-escaneando...', 'warning')
            await waitForStableUI(page)
          }
        }
      } catch (err: any) {
        await vigaLog(suiteId, `⚠️ Error ejecutando acción: ${err.message}`, 'warning')
        await recordStep(suiteId, page, 'Error ejecutando acción', 'failed', err.message)
      }
    }
  } finally {
    await page.close()
  }
}
