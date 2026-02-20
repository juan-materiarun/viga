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
        fast: 'llama-3.1-8b-instant',      // Fast, cheap, simple tasks
        smart: 'llama-3.3-70b-versatile',  // Balanced, most tasks
        premium: 'llama-3.3-70b-versatile' // Complex reasoning (fallback to same for now)
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
    retries = 5
): Promise<any> {

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
): Promise<{ selected_id: string; reason: string; suggested_payload?: string } | null> {
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
    2. BARRER: Si hay inputs, llénalos con datos COHERENTES al objetivo.
    3. NAVEGAR: Solo sal de la página si el objetivo actual está cumplido.
    4. NO REPETIR: Prioriza candidatos que NO figuran en el HISTORIAL RECIENTE.

    INSTRUCCIONES CLAVE PARA INPUTS:
    - DETECTA EL CONTEXTO del campo (por nombre, etiqueta, placeholder).
    - SI el campo menciona HTML, CSS, JS, código, snippet o "pega" → generated_payload debe ser un SNIPPET de código HTML real.
    - SI es "URL" o "Website": Usar "https://viga.dev".
    - SI es "Email": Usar email válido.
    - SI es "Búsqueda": Usar términos relevantes.
    
    Selecciona el MEJOR paso siguiente que NO esté en el historial reciente.`;

    const user = `Candidatos:
${candidates.map(c => `- [${c.id}] (${c.category}) ${c.name}`).join('\n')}

Formato de Respuesta JSON: { "selected_id": "uuid", "reason": "proceso de pensamiento en español", "suggested_payload": "valor para input (opcional)" }`;

    const res = await callGroqJSON(ctx, system, user);
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
    URL: ${url}
    Título: ${title}
    Contexto (Accessibility Tree JSON o Texto):
    ${contextSummary}

    INSTRUCCIONES CLAVE:
    1. Si ves texto como "Loading", "Cargando", "Processing" -> Tu estrategia debe ser "ESPERAR".
    2. Si ves errores -> Tu estrategia debe ser "REPORTAR_ERROR".
    3. Si es un formulario -> Tu estrategia es "LLENAR_DATOS".

    ANALIZA Y RESPONDE EN FORMATO JSON:
    1. "page_type": Tipo de página (LOGIN, DASHBOARD, LOADING_STATE, ERROR_PAGE, etc).
    2. "purpose": Breve descripción en ESPAÑOL.
    3. "strategy": Estrategia recomendada.

    Formato JSON: { "page_type": "string", "purpose": "string", "strategy": "string" }`;

    const user = "Analiza el estado actual de la página.";

    return await callGroqJSON(ctx, system, user) || { page_type: 'DESCONOCIDO', purpose: 'Explorar', strategy: 'Exploración genérica' };
}
