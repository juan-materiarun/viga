import Groq from 'groq-sdk'

/* ───────── TIPOS ───────── */

export type LLMContext = {
  keys: string[]
  pointer: number
  cooldownUntil: number
}

/* ───────── CONTEXTO POR AGENTE ───────── */

export function createLLMContext(): LLMContext {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3
  ].filter(Boolean) as string[]

  if (keys.length === 0) {
    throw new Error('❌ No hay llaves de Groq configuradas.')
  }

  return {
    keys,
    pointer: 0,
    cooldownUntil: 0
  }
}

/* ───────── UTILIDADES ───────── */

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function getClient(ctx: LLMContext) {
  const key = ctx.keys[ctx.pointer % ctx.keys.length]
  ctx.pointer++

  console.log(`[VIGA-LLM] Usando key slot ${ctx.pointer}/${ctx.keys.length}`)
  return new Groq({ apiKey: key })
}

/* ───────── API PRINCIPAL ───────── */

export async function callGroqJSON(
  ctx: LLMContext,
  system: string,
  user: string,
  retries = 3
): Promise<any> {

  if (Date.now() < ctx.cooldownUntil) {
    await sleep(ctx.cooldownUntil - Date.now())
  }

  try {
    const groq = getClient(ctx)

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
    })

    const raw = res.choices[0].message.content || '{}'
    return JSON.parse(raw.replace(/```json|```/g, '').trim())

  } catch (err: any) {
    const msg = err?.message || ''

    if (msg.includes('rate') || msg.includes('429')) {
      console.warn('[GROQ] Rate limit detectado, cooldown 3s')
      ctx.cooldownUntil = Date.now() + 3000
    }

    if (retries <= 0) return null

    await sleep(1500)
    return callGroqJSON(ctx, system, user, retries - 1)
  }
}
