import Groq from 'groq-sdk';

/* ───────── TIPOS ───────── */

export type LLMContext = {
    keys: string[];
    pointer: number;
    cooldownUntil: number;
};

/* ───────── CONTEXTO POR AGENTE ───────── */

export function createLLMContext(): LLMContext {
    const keys = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
        throw new Error('❌ No hay llaves de Groq configuradas.');
    }

    return {
        keys,
        pointer: 0,
        cooldownUntil: 0
    };
}

/* ───────── UTILIDADES ───────── */

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function getClient(ctx: LLMContext) {
    const totalKeys = ctx.keys.length;
    const currentSlot = ctx.pointer % totalKeys;
    const key = ctx.keys[currentSlot];
    ctx.pointer++;

    console.log(`[VIGA-LLM] Usando key slot ${currentSlot + 1}/${totalKeys}`);
    return new Groq({ apiKey: key });
}

/* ───────── API PRINCIPAL ───────── */

export async function callGroqJSON(
    ctx: LLMContext,
    system: string,
    user: string,
    retries = 5 // Increased default retries
): Promise<any> {

    if (Date.now() < ctx.cooldownUntil) {
        const waitTime = ctx.cooldownUntil - Date.now();
        console.log(`[VIGA-LLM] Cooldown activo. Esperando ${waitTime}ms...`);
        await sleep(waitTime);
    }

    try {
        const groq = getClient(ctx);

        const res = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `${system}

DIRECTIVAS DE QA SENIOR:
1. Genera casos de prueba reales y humanos.
2. NO inventes botones inexistentes.
3. Si un botón requiere input previo, complétalo.
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
            // Exponentially increase cooldown on repeated failures
            const baseWait = 3000;
            const multiplier = (6 - retries); // 1st try = 3s, 2nd = 6s, etc.
            const waitTime = baseWait * multiplier;

            console.warn(`[GROQ] Rate limit detectado. Incrementando cooldown a ${waitTime}ms (Intentos restantes: ${retries})`);
            ctx.cooldownUntil = Date.now() + waitTime;

            // Wait immediately before retrying
            await sleep(waitTime);
        }

        if (retries <= 0) {
            console.error('[VIGA-LLM] ❌ Se agotaron los reintentos. La IA no responde.');
            return null;
        }

        return callGroqJSON(ctx, system, user, retries - 1);
    }
}


/**
 * PHASE 4: Batch Ranking of Actions
 * Ranks candidate actions to find the most valuable next step.
 */
export async function batchRankActions(
    ctx: LLMContext,
    candidates: { id: string; name: string; category: string }[],
    goal?: string
): Promise<{ selected_id: string; reason: string } | null> {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return { selected_id: candidates[0].id, reason: 'Only candidate available' };

    const system = `You are a Chaos Testing Agent. Return the ID of the SINGLE most valuable action to execute next.
PRIORITY:
1. Actions that reveal new content (Open Modal, Expand, Navigate).
2. Form interactions (Inputs, Submits).
3. State toggles (only if likely to show new UI).
4. Ignore purely decorative or redundant links.
5. PREFER actions that match the goal: "${goal || 'Explore everything'}".`;

    const user = `Candidates:
${candidates.map(c => `- [${c.id}] (${c.category}) ${c.name}`).join('\n')}

Response Format JSON: { "selected_id": "uuid", "reason": "short explanation" }`;

    const res = await callGroqJSON(ctx, system, user);
    return res;
}
