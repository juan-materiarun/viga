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

async function recordStep(
  suiteId: string,
  page: any,
  title: string,
  status: 'success' | 'failed' | 'running' | 'warning',
  description: string = '',
  actionData?: {
    selector?: string,
    xpath?: string,
    actionType?: 'click' | 'type' | 'navigate',
    payload?: string
  }
) {
  const stepId = crypto.randomUUID()
  const evidence = await captureEvidence(page, suiteId, stepId, false)

  // Title = Uppercase Action (e.g. "CAMBIAR TEMA")
  // Expected Result = Reasoning/Thought (e.g. "Detecté el botón...")
  const { error } = await supabase.from('test_steps').insert({
    id: stepId,
    suite_id: suiteId,
    title: title,
    expected_result: description,
    status: status,
    screenshot_url: evidence.screenshotUrl,
    selector: actionData?.selector,
    xpath: actionData?.xpath,
    action_type: actionData?.actionType,
    action_payload: actionData?.payload
  })

  if (error) console.error('Error saving step:', error)
}

async function updateStep(
  stepId: string,
  suiteId: string,
  page: any,
  status: 'success' | 'failed' | 'running' | 'warning',
  description: string = ''
) {
  // Capture new evidence for this run
  const evidence = await captureEvidence(page, suiteId, stepId, false)

  const { error } = await supabase.from('test_steps').update({
    status: status,
    screenshot_url: evidence.screenshotUrl,
    expected_result: description
  }).eq('id', stepId)

  if (error) console.error('Error updating step:', error)
}

/* ───────── UI STABILITY ───────── */

async function waitForStableUI(page: any, timeout = 15000) {
  const start = Date.now()
  let stableCount = 0

  while (Date.now() - start < timeout) {
    const unstable = await page.evaluate(() => {
      const hasLoader = document.querySelector('.loader, .spinner, .loading, [aria-busy="true"], .MuiCircularProgress-root, [data-loading="true"]') !== null
      const textLoading = document.body.innerText.toLowerCase().match(/cargando\.\.\.|loading\.\.\.|procesando\.\.\./)
      return hasLoader || !!textLoading
    })

    if (!unstable) {
      stableCount++
      if (stableCount > 2) return
    } else {
      stableCount = 0
    }
    await sleep(300)
  }
}

/* ───────── DOM & SELECTORS ───────── */

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
    return Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"], [tabindex="0"]'))
      .map((e, i) => {
        const el = e as HTMLElement
        const r = el.getBoundingClientRect()
        const style = window.getComputedStyle(el)
        if (r.width < 5 || r.height < 5 || style.visibility === 'hidden' || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.closest('[disabled]')) return null

        const placeholder = el.getAttribute('placeholder') || ''
        const aria = el.getAttribute('aria-label') || ''
        const name = el.getAttribute('name') || ''
        const role = el.getAttribute('role') || ''
        const type = el.getAttribute('type') || ''

        let labelText = ''
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`) as HTMLElement
          if (label) labelText = label.innerText || label.textContent || ''
        }
        if (!labelText && el.closest('label')) {
          const label = el.closest('label') as HTMLElement
          labelText = label?.innerText || label?.textContent || ''
        }

        // @ts-ignore
        let selector = window.getVigaSelector(el)
        // @ts-ignore
        const xpath = window.getVigaXPath(el)

        if (el.id) selector = `#${el.id}`
        else if (name) selector = `${el.tagName.toLowerCase()}[name="${name}"]`

        const cleanText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100)
        const hint = [labelText, placeholder, aria, name, role, cleanText].filter(Boolean).join(' | ')

        return { i, tag: el.tagName.toLowerCase(), text: cleanText, hint: hint, selector, xpath, attributes: { type, name, id: el.id } }
      })
      .filter(Boolean) as UIElement[]
  })
}

// ─── SMART WAITING CORE (UNIVERSAL) ───

async function smartWaitForElements(page: any, suiteId: string): Promise<UIElement[]> {
  // 1. First, try standard scan
  let elements = await getActiveElements(page)
  if (elements.length > 0) return elements

  // 2. If empty, enter Smart Poll (60s)
  await vigaLog(suiteId, '⚠️ Página vacía. Iniciando "Espera Profunda" (hasta 60s)...', 'warning')

  const POLL_MAX = 60000
  const POLL_INTERVAL = 2000
  let waited = 0
  const currentUrl = page.url()

  while (waited < POLL_MAX) {
    await sleep(POLL_INTERVAL)
    waited += POLL_INTERVAL

    // Navigation Check
    if (page.url() !== currentUrl) {
      await vigaLog(suiteId, `🔄 Navegación detectada: ${page.url()}`, 'info')
      // Don't recurse infinitely, just one fresh check after nav
      await waitForStableUI(page)
      return await getActiveElements(page)
    }

    // Element Check
    elements = await getActiveElements(page)
    if (elements.length > 0) {
      await vigaLog(suiteId, `👀 Elementos aparecieron tras ${waited / 1000}s!`, 'success')
      return elements
    }

    // Heartbeat
    if (waited % 10000 === 0) {
      await vigaLog(suiteId, `⏳ Esperando carga... (${waited / 1000}s)`, 'info')
    }
  }

  await vigaLog(suiteId, `🛑 Tiempo agotado (${POLL_MAX / 1000}s). Página inactiva.`, 'error')
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

    // USE SMART WAIT (Now Scout is also resilient to slow apps)
    const elements = await smartWaitForElements(page, suiteId)

    await vigaLog(suiteId, `👀 Encontrados ${elements.length} elementos interactivos`, 'info')

    let inserted = 0
    const batchSize = 10

    for (let i = 0; i < elements.length; i += batchSize) {
      const chunk = elements.slice(i, i + batchSize)

      for (const el of chunk) {
        const { error } = await supabase.from('discovered_elements').upsert({
          suite_id: suiteId,
          selector: el.selector,
          tag_name: el.tag,
          text: el.text || el.hint,
          url: url,
          status: 'active',
          priority: 1,
          identity_data: {
            hint: el.hint,
            attributes: el.attributes,
            xpath: el.xpath
          }
        }, { onConflict: 'suite_id, selector' })

        if (!error) inserted++
      }
    }

    await vigaLog(suiteId, `📦 Scout DB: ${inserted} elementos registrados`, 'success')
    await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId)
  } catch (e: any) {
    console.error(e)
    await vigaLog(suiteId, `❌ Scout Error: ${e.message}`, 'error')
    await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId)
    throw e
  } finally {
    await page.close()
  }
}

/* ───────── CHAOS AGENT ───────── */

const CHAOS_SYSTEM = `
Eres un Tester de Chaos Inteligente y Analítico. Tu misión es explorar aplicaciones web como lo haría un QA experto.

CONTEXTO QUE RECIBIRÁS:
- Contenido visible de la página (texto, encabezados)
- Elementos interactivos con sus propiedades
- Historial de acciones previas

TU PROCESO DE DECISIÓN:
1. ANALIZA el propósito de la página actual (¿Landing?, ¿Login?, ¿Dashboard?).
2. FASE 1 - EXPLORACIÓN LOCAL: Debes interactuar con TODOS los elementos relevantes de la vista actual (botones, toggles, inputs) ANTES de navegar a otra página.
3. FASE 2 - NAVEGACIÓN PROFUNDA: Solo si la vista actual está "agotada" (todos los elementos visitados), busca links de navegación o login.

EJEMPLOS DE RAZONAMIENTO:
✅ BIEN: "Estoy en la Landing. Hay botones de 'Features' y 'Pricing' que no he probado. Los clickearé antes de ir a 'Login'."
✅ BIEN: "Estoy en un formulario. Llenaré todos los campos antes de enviar."
❌ MAL: "Veo un botón Login, iré directo ahí (ignorando el resto de la landing)."

REGLAS CRÍTICAS:
1. JAMÁS selecciones un elemento con "visited": true.
2. Si TODOS los elementos tienen "visited": true -> Action: "finish".
3. PRIORIDAD MÁXIMA: No saltes pasos. Si hay botones funcionales en la pantalla actual, clickéalos primero.
4. Si detectas un cambio de tab/pestaña, asume que es una vista nueva y resetea tu curiosidad exploratoria.

Responde JSON:
{
  "title": "ACCIÓN CLARA (Ej: PROBAR LOGIN)",
  "thought": "Razonamiento contextual detallado sobre POR QUÉ esta acción es importante según el contenido de la página",
  "index": number,
  "action": "click" | "type" | "finish",
  "payload": "string si action=type"
}
`

export async function runChaosAgent(url: string, suiteId: string, credentials?: any) {
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

      const elements = await smartWaitForElements(page, suiteId)
      const currentUrl = page.url()

      if (elements.length === 0) {
        await vigaLog(suiteId, '🛑 No se detectaron elementos. Chaos finalizado.', 'warning')
        break
      }

      const stateHash = crypto.createHash('md5').update(currentUrl + elements.length).digest('hex')
      if (!visitedStates.has(stateHash)) {
        visitedStates.add(stateHash)
        await vigaLog(suiteId, `📍 Nuevo estado: ${currentUrl} (${elements.length} elems)`, 'info')

        // Continuous Discovery: Upsert found elements to global DB
        const upsertBatch = elements.map(el => ({
          suite_id: suiteId,
          selector: el.selector,
          tag_name: el.tag,
          text: el.text || el.hint,
          url: currentUrl,
          status: 'active',
          priority: 1,
          identity_data: {
            hint: el.hint,
            attributes: el.attributes,
            xpath: el.xpath
          }
        }))

        await supabase.from('discovered_elements').upsert(upsertBatch, { onConflict: 'suite_id, selector' })
      }

      const mappedElements = elements.map(e => {
        // Normalize URL for fingerprinting (strip hash/query to handle SPAs)
        const baseUrl = currentUrl.split('#')[0].split('?')[0]
        const fingerprint = `${baseUrl}::${e.selector}`
        return {
          i: e.i,
          tag: e.tag,
          hint: e.hint,
          selector: e.selector,
          visited: visitedFingerprints.has(fingerprint)
        }
      })

      const unvisitedCount = mappedElements.filter(e => !e.visited).length

      // RICH CONTEXT EXTRACTION
      const pageContent = await page.textContent('body').catch(() => '')
      const headings = await page.$$eval('h1, h2, h3', els => els.map(el => el.textContent?.trim()).filter(Boolean)).catch(() => [])
      const formCount = await page.$$eval('form', forms => forms.length).catch(() => 0)

      const context = JSON.stringify({
        url: currentUrl,
        title: await page.title(),
        page_content: pageContent.slice(0, 2000), // First 2000 chars
        headings: headings.slice(0, 10), // Top 10 headings
        forms_detected: formCount,
        history: history.slice(-15),
        interactive_elements: mappedElements,
        stats: { unvisited_elements: unvisitedCount, total_elements: mappedElements.length },
        credentials_vault: credentials ? "AVAILABLE (Use these for login forms if needed)" : "NONE",
        available_credentials: credentials
      })

      const decision = await callGroqJSON(llmCtx, CHAOS_SYSTEM, context)

      if (!decision) { break }

      if (decision.action === 'finish') {
        await vigaLog(suiteId, '✅ Chaos: Cobertura completada.', 'success')
        await recordStep(suiteId, page, 'EXPLORACIÓN COMPLETADA', 'success', decision.thought || 'No hay más elementos nuevos que probar.')
        break
      }

      if (typeof decision.index !== 'number') break

      const target = elements.find(e => e.i === decision.index)

      if (target) {
        // Normalize URL for fingerprinting (strip hash/query to handle SPAs)
        const baseUrl = currentUrl.split('#')[0].split('?')[0]
        const fingerprint = `${baseUrl}::${target.selector}`
        const actionDesc = `${decision.action} en "${target.hint}"`
        await vigaLog(suiteId, `👉 [${actions + 1}/${MAX_ACTIONS}] ${decision.title || actionDesc}`, 'info')

        history.push(`${decision.title}: ${decision.thought}`)

        // MARK AS VISITED BEFORE ACTION (prevents LLM from seeing it again in next iteration)
        visitedFingerprints.add(fingerprint)
        await vigaLog(suiteId, `🔖 Marcado como visitado: ${fingerprint.slice(0, 80)}...`, 'info')

        try {
          if (decision.action === 'type') {
            // Check if this is a credential field
            let payload = decision.payload || 'Val';
            if (credentials && (target.selector.includes('password') || target.selector.includes('pass'))) {
              payload = credentials.password || payload;
            } else if (credentials && (target.selector.includes('email') || target.selector.includes('user'))) {
              payload = credentials.username || payload;
            }

            try { await page.fill(target.selector, payload) }
            catch (e) { if (target.xpath) await page.fill(`xpath=${target.xpath}`, payload); else throw e }
          } else {
            try { await page.click(target.selector, { timeout: 5000 }) }
            catch (e) { if (target.xpath) await page.click(`xpath=${target.xpath}`, { timeout: 5000 }); else throw e }
          }

          actions++
          await sleep(3000)

          // USE TITLE + THOUGHT properly + SAVE SELECTOR for regression
          await recordStep(suiteId, page, decision.title || actionDesc, 'success', decision.thought || actionDesc, {
            selector: target.selector,
            xpath: target.xpath,
            actionType: decision.action as 'click' | 'type',
            payload: decision.action === 'type' ? (credentials && (target.selector.includes('password') || target.selector.includes('pass')) ? '******' : decision.payload) : null
          })
        } catch (err: any) {
          await vigaLog(suiteId, `⚠️ Fallo: ${err.message}`, 'warning')
          await recordStep(suiteId, page, `ERROR: ${decision.title}`, 'failed', err.message)
        }
      }
      await sleep(1000)
    }
    await vigaLog(suiteId, '🏁 Chaos Session Finalizada', 'success')
    await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId)
  } catch (e: any) {
    await recordStep(suiteId, page, 'FATAL ERROR', 'failed', e.message)
    await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId)
    throw e
  } finally {
    await page.close()
  }
}

/* ───────── STRIKE AGENT ───────── */

const STRIKE_SYSTEM = `
Eres un Agente Autónomo Web (ReAct). Objetivo: "{goal}"

INSTRUCCIONES DE RESPUESTA:
1. "title": TÍTULO CORTO DEL PASO (Ej: "ACTIVAR MODO OSCURO").
2. "thought": Razonamiento (Ej: "Veo el botón Light, lo clickearé para cambiar...").
3. Si el objetivo está cumplido visualmente -> Action: "finish".

JSON:
{ "title": "...", "thought": "...", "status": "active"|"completed"|"failed", "action": "click"|"type"|"wait"|"finish", "index": number, "payload": "..." }
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
    let lastAction = ''

    while (steps < MAX_STEPS) {
      await waitForStableUI(page)
      const elements = await smartWaitForElements(page, suiteId)
      if (elements.length === 0) break

      const context = JSON.stringify({
        objective: goal,
        current_url: page.url(),
        page_title: await page.title(),
        last_action: lastAction,
        visible_elements: elements.map(e => ({ i: e.i, tag: e.tag, hint: e.hint }))
      })

      const systemPrompt = STRIKE_SYSTEM.replace('{goal}', goal)
      const plan = await callGroqJSON(llmCtx, systemPrompt, context)

      if (!plan) break

      await vigaLog(suiteId, `🤔 (${steps + 1}) ${plan.title || plan.thought}`, 'info')

      if (plan.status === 'completed' || plan.action === 'finish') {
        await vigaLog(suiteId, '✅ Objetivo Cumplido', 'success')
        await recordStep(suiteId, page, 'OBJETIVO CUMPLIDO', 'success', plan.thought)
        break
      }
      if (plan.status === 'failed') {
        await recordStep(suiteId, page, 'MISIÓN FALLIDA', 'failed', plan.thought)
        break
      }

      steps++
      try {
        if (plan.action === 'wait') {
          await sleep(2000)
        } else if (plan.index !== undefined) {
          const target = elements.find(e => e.i === plan.index)
          if (target) {
            lastAction = `${plan.action} on ${target.hint}`

            if (plan.action === 'type') {
              try { await page.fill(target.selector, plan.payload || '') }
              catch (e) { if (target.xpath) await page.fill(`xpath=${target.xpath}`, plan.payload || ''); else throw e }
            } else {
              try { await page.click(target.selector, { timeout: 5000 }) }
              catch (e) { if (target.xpath) await page.click(`xpath=${target.xpath}`, { timeout: 5000 }); else throw e }
            }
            await sleep(3000)
            // USE TITLE properly + SAVE SELECTOR for regression
            await recordStep(suiteId, page, plan.title || plan.thought, 'success', plan.thought, {
              selector: target.selector,
              xpath: target.xpath,
              actionType: plan.action as 'click' | 'type',
              payload: plan.payload
            })
          }
        }
      } catch (err: any) {
        await recordStep(suiteId, page, 'ERROR DE EJECUCIÓN', 'failed', err.message)
      }
    }
    await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId)
  } catch (e: any) {
    await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId)
    throw e
  } finally {
    await page.close()
  }
}

/* ───────── REPLAY AGENT (SELF-HEALING REGRESSION) ───────── */

export async function runReplayAgent(url: string, suiteId: string, recordedSteps: any[]) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const llmCtx = createLLMContext()

  // Ensure steps are executed in chronological order (safety sort)
  const steps = [...recordedSteps].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  await vigaLog(suiteId, `🔁 Iniciando Regresión: ${steps.length} pasos.`, 'info')

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }) } catch (e) { }

    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx]
      await vigaLog(suiteId, `▶️ Paso ${idx + 1}: ${step.title}`, 'info')
      await waitForStableUI(page)

      let success = false
      let healedSelector = null

      try {
        // STRATEGY 1: Try saved selector (FAST PATH - No AI)
        if (step.selector || step.xpath) {
          try {
            const targetSelector = step.selector || `xpath=${step.xpath}`

            if (step.action_type === 'type') {
              await page.fill(targetSelector, step.action_payload || '', { timeout: 3000 })
            } else {
              await page.click(targetSelector, { timeout: 3000 })
            }

            success = true
            await vigaLog(suiteId, `✅ Selector directo funcionó`, 'success')

          } catch (selectorError) {
            // Selector failed, try AI healing
            await vigaLog(suiteId, `⚠️ Selector roto. Intentando auto-curación...`, 'warning')
          }
        }

        // STRATEGY 2: AI Self-Healing (if selector failed or missing)
        if (!success) {
          const elements = await smartWaitForElements(page, suiteId)

          const HEAL_SYSTEM = `
                    Eres VIGA SELF-HEAL. El selector guardado falló.
                    Busca el elemento que mejor coincida con: "${step.title}: ${step.expected_result}"
                    Responde JSON: { "index": number, "confidence": "high"|"low" }
                  `

          const context = JSON.stringify({
            target_description: `${step.title}: ${step.expected_result}`,
            visible_elements: elements.map(e => ({ i: e.i, tag: e.tag, hint: e.hint }))
          })

          const healing = await callGroqJSON(llmCtx, HEAL_SYSTEM, context)

          if (healing && healing.index !== undefined) {
            const newTarget = elements.find(e => e.i === healing.index)

            if (newTarget) {
              if (step.action_type === 'type') {
                await page.fill(newTarget.selector, step.action_payload || '')
              } else {
                await page.click(newTarget.selector)
              }

              success = true
              healedSelector = newTarget.selector

              // UPDATE DB with new selector (LEARNING)
              await supabase.from('test_steps').update({
                selector: newTarget.selector,
                xpath: newTarget.xpath
              }).eq('id', step.id)

              await vigaLog(suiteId, `🔧 Auto-curado! Nuevo selector guardado.`, 'success')
            }
          }
        }

        await sleep(2000)

        if (success) {
          await updateStep(step.id, suiteId, page, 'success', healedSelector ? 'Auto-curado exitosamente' : 'Regresión OK')
        } else {
          await updateStep(step.id, suiteId, page, 'failed', 'No se pudo ejecutar ni auto-curar')
        }

      } catch (e: any) {
        await updateStep(step.id, suiteId, page, 'failed', `Error: ${e.message}`)
      }
    }

    await vigaLog(suiteId, '✅ Regresión Finalizada', 'success')
    await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId)
  } catch (e: any) {
    await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId)
    throw e
  } finally {
    await page.close()
  }
}
