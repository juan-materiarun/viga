import Groq from 'groq-sdk';
import { Logger } from './logger';

/* ───────── TIPOS ───────── */

export type LLMContext = {
    keys: string[];
    pointer: number;
    cooldownUntil: number;
    model: string; // Model to use for this context
};

export type ModelTier = 'fast' | 'smart' | 'premium';

/* ───────── CONTEXTO POR AGENTE ───────── */

export function createLLMContext(tier: ModelTier = 'smart'): LLMContext {
    const keys = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
        throw new Error('❌ No hay llaves de Groq configuradas.');
    }

    // Model selection based on tier
    const models: Record<ModelTier, string> = {
        fast: 'llama-3.1-8b-instant',      // Fast responses, page analysis, simple decisions
        smart: 'llama-3.3-70b-versatile',  // Complex reasoning, action ranking
        premium: 'llama-3.3-70b-versatile' // Future: deepseek or claude
    };

    return {
        keys,
        pointer: 0,
        cooldownUntil: 0,
        model: models[tier]
    };
}

/* ───────── UTILIDADES ───────── */

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function getClient(ctx: LLMContext) {
    const totalKeys = ctx.keys.length;
    const currentSlot = ctx.pointer % totalKeys;
    const key = ctx.keys[currentSlot];
    ctx.pointer++;

    Logger.debug(`[VIGA-LLM] Using key slot ${currentSlot + 1}/${totalKeys}`);
    return new Groq({ apiKey: key });
}

/* ───────── API PRINCIPAL ───────── */

export async function callGroqJSON(
    ctx: LLMContext,
    system: string,
    user: string,
    retries = 5,
    modelOverride?: string  // TURBO: caller can specify a different model without creating a new context
): Promise<any> {

    if (Date.now() < ctx.cooldownUntil) {
        const waitTime = ctx.cooldownUntil - Date.now();
        Logger.debug(`[VIGA-LLM] Cooldown active. Waiting ${waitTime}ms...`);
        await sleep(waitTime);
    }

    const model = modelOverride || ctx.model;

    try {
        const groq = getClient(ctx);

        const res = await groq.chat.completions.create({
            model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `${system}

DIRECTIVAS DE QA SENIOR:
1. Genera casos de prueba reales y humanos.
2. NO inventes botones inexistentes.
3. Razona y responde SIEMPRE en ESPAÑOL.
4. Devuelve SIEMPRE JSON válido.`
                },
                { role: 'user', content: user }
            ]
        });

        const raw = res.choices[0].message.content || '{}';
        return JSON.parse(raw.replace(/```json|```/g, '').trim());

    } catch (err: any) {
        const msg = err?.message || '';
        const isRateLimit = msg.includes('rate') || msg.includes('429');

        if (isRateLimit) {
            const baseWait = 3000;
            const multiplier = (6 - retries);
            const waitTime = baseWait * multiplier;

            Logger.warn(`[GROQ] Rate limit detected. Increasing cooldown to ${waitTime}ms (Retries left: ${retries})`);
            ctx.cooldownUntil = Date.now() + waitTime;
            await sleep(waitTime);
        }

        if (retries <= 0) {
            Logger.error('[VIGA-LLM] ❌ Retries exhausted. AI unresponsive.', err);
            return null;
        }

        return callGroqJSON(ctx, system, user, retries - 1);
    }
}

export async function callGroq(
    ctx: LLMContext,
    system: string,
    user: string,
    retries = 5
): Promise<string> {

    if (Date.now() < ctx.cooldownUntil) {
        const waitTime = ctx.cooldownUntil - Date.now();
        Logger.debug(`[VIGA-LLM] Cooldown active. Waiting ${waitTime}ms...`);
        await sleep(waitTime);
    }

    try {
        const groq = getClient(ctx);

        const res = await groq.chat.completions.create({
            model: ctx.model, // Use model from context
            temperature: 0.2,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ]
        });

        return res.choices[0].message.content || '';

    } catch (err: any) {
        const msg = err?.message || '';
        const isRateLimit = msg.includes('rate') || msg.includes('429');

        if (isRateLimit) {
            const baseWait = 3000;
            const multiplier = (6 - retries);
            const waitTime = baseWait * multiplier;

            Logger.warn(`[GROQ] Rate limit detected. Increasing cooldown to ${waitTime}ms (Retries left: ${retries})`);
            ctx.cooldownUntil = Date.now() + waitTime;
            await sleep(waitTime);
        }

        if (retries <= 0) {
            Logger.error('[VIGA-LLM] ❌ Retries exhausted. AI unresponsive.', err);
            return '';
        }

        return callGroq(ctx, system, user, retries - 1);
    }
}


/**
 * PHASE 4: Batch Ranking of Actions (V4 BROOM LOGIC)
 * Ranks candidate actions to find the most valuable next step.
 */
export async function batchRankActions(
    ctx: LLMContext,
    candidates: { id: string; name: string; category: string }[],
    pageContext?: string,
    goal?: string,
    purpose?: string,
    recentHistory?: string[] // V4.4: Last N action names taken, to avoid repetition
): Promise<{ selected_id: string; reason: string; suggested_payload?: string; semantic_type?: string; confidence?: number } | null> {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return { selected_id: candidates[0].id, reason: 'Only candidate available' };

    const historySection = recentHistory && recentHistory.length > 0
        ? `\n\n    ⚠️ HISTORIAL RECIENTE (EVITAR REPETIR ESTAS ACCIONES):\n    ${recentHistory.map(h => `- "${h}"`).join('\n    ')}\n    Si todos los candidatos están en el historial, elige el que genere mayor impacto o diferente estado.`
        : '';

    const system = `Eres un QA Engineer Senior implementando la estrategia "BARREDORA" (BROOM SWEEP).
    
    CONTEXTO DE LA PÁGINA:
    - Tipo/Contexto: ${pageContext || 'No especificado'}
    - Objetivo Principal: ${purpose || 'Exploración General'}
    - Meta de la Prueba: "${goal || 'Validación sistemática'}"${historySection}

    ESTRATEGIA:
    1. ALINEAR: Todas las acciones deben avanzar hacia el "Objetivo Principal".
    2. BARRER: Si hay inputs, llénalos con datos COHERENTES al objetivo. NO uses "example.com" ni valores falsos genéricos.
    3. NAVEGAR: Explora TODOS los botones disponibles (idiomas, temas, configuraciones) antes de cambiar de página.
    4. NO REPETIR: Prioriza candidatos que NO figuran en el HISTORIAL RECIENTE.
    5. RAZONAR: Para cada acción, debes explicar QUÉ crees que hace el botón y QUÉ esperas que ocurra.

    INSTRUCCIONES CLAVE PARA INPUTS:
    - DETECTA EL CONTEXTO del campo (por nombre, etiqueta, placeholder).
    - CLASIFICA EL TIPO SEMÁNTICO (semantic_type): AUDIT_TARGET_URL, CODE_EDITOR, EMAIL_LOGIN, PASSWORD_LOGIN, SEARCH_QUERY, etc.
    - SI el campo menciona HTML, CSS, JS, código, snippet o "pega" → generated_payload debe ser un SNIPPET de código HTML/JS real y funcional.
    - SI es "URL" o "Website": Usar "https://viga.dev".
    
    Selecciona el MEJOR paso siguiente.`;

    const user = `Candidatos:
${candidates.map(c => `- [${c.id}] (${c.category}) ${c.name}`).join('\n')}

Formato de Respuesta JSON: 
{ 
  "selected_id": "uuid", 
  "reason": "Pienso que este elemento sirve para [función detectada] y espero que al interactuar ocurra [resultado esperado]", 
  "suggested_payload": "valor real y coherente",
  "semantic_type": "AUDIT_TARGET_URL | CODE_EDITOR | ...",
  "confidence": 0.95
}`;

    // TURBO: batchRankActions is complex multi-step reasoning → always use smart (70B) model
    const res = await callGroqJSON(ctx, system, user, 5, 'llama-3.3-70b-versatile');
    return res;
}

/**
 * V4: Page Context Analysis (The Cartographer's Logic)
 * Analyzes the screen to determine what kind of page we are on and what's missing.
 */
export async function analyzePageContext(
    ctx: LLMContext,
    url: string,
    title: string,
    contextSummary: string // Changed from elementSummary to generic context
): Promise<{ page_type: string; missing_data: string[]; strategy: string }> {
    const system = `Eres un Arquitecto de Pruebas de IA (El Cartógrafo). Tu trabajo es ENTENDER EL ESTADO Y FINALIDAD de esta página.

    URL: ${url}
    Título: ${title}
    Contexto (Accessibility Tree JSON o Texto):
    ${contextSummary}

    INSTRUCCIONES CLAVE:
    1. Estrategia "ESPERAR" SOLO si hay un SPINNER o OVERLAY de carga que bloquee TODA la pantalla, o si la página está literalmente en blanco con un mensaje de "Cargando".
    2. Si ves botones, inputs o enlaces -> La estrategia debe ser "EXPLORAR" o "LLENAR_DATOS", incluso si hay palabras como "Auditando" en el texto decorativo.
    3. NO te dejes engañar por landing pages que describen procesos (ej: "Estamos auditando el mundo"). Si hay una caja de texto para ingresar una URL, la página NO está cargando, está LISTA.
    4. Identifica claramente como MARKETING_LANDING si es la página inicial con un CTA.

    ANALIZA Y RESPONDE EN FORMATO JSON:
    1. "page_type": Tipo de página (LOGIN, DASHBOARD, LOADING_STATE, AUDIT_PROGRESS, ERROR_PAGE, etc).
    2. "purpose": Breve descripción en ESPAÑOL.
    3. "strategy": Estrategia recomendada.
    4. "evidence": El fragmento de texto o indicador específico del contexto que justifica esta clasificación.
    
    Formato JSON: { "page_type": "string", "purpose": "string", "strategy": "string", "evidence": "string" }`;

    const user = "Analiza el estado actual de la página.";

    // TURBO: page context analysis requires high-precision judgment to avoid false "WAIT" states
    return await callGroqJSON(ctx, system, user, 5, 'llama-3.3-70b-versatile') || { page_type: 'DESCONOCIDO', purpose: 'Explorar', strategy: 'Exploración genérica' };
}
