import Groq from 'groq-sdk'

const keys = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3
].filter(Boolean) as string[]

let pointer = 0
let cooldownUntil = 0

/**
 * Rota entre las llaves de API disponibles para maximizar el throughput
 */
function getClient() {
  const key = keys[pointer]
  pointer = (pointer + 1) % keys.length
  return new Groq({ apiKey: key })
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Lógica central de LLM para el Agente Chaos.
 * Diseñado para razonamiento táctico y descubrimiento de errores.
 */
export async function callGroqJSON(
  system: string,
  user: string,
  retries = 3
): Promise<any> {
  // Verificación de Cooldown por Rate Limits (429)
  if (Date.now() < cooldownUntil) {
    const waitTime = cooldownUntil - Date.now()
    console.log(`[GROQ] Cooldown activo. Esperando ${waitTime}ms...`)
    await sleep(waitTime)
  }

  try {
    const groq = getClient()

    const res = await groq.chat.completions.create({
      // ✅ Llama 3.3 70B: El modelo más capaz en Groq actualmente para razonamiento
      model: 'llama-3.3-70b-versatile', 
      temperature: 0.3, // 0.3 fomenta la exploración creativa sin romper el JSON
      response_format: { type: 'json_object' },
      messages: [
        { 
          role: 'system', 
          content: `${system} 
          
          DIRECTIVAS CRÍTICAS DE PENSAMIENTO:
          1. Actúa como un Hacker Ético y QA Senior.
          2. No seas complaciente; busca flujos donde la lógica del desarrollador pueda fallar.
          3. Si detectas elementos 'disabled', tu razonamiento debe explicar qué campos faltan completar para activarlos.
          4. Prioriza acciones que cambien el estado de la aplicación o revelen nuevas capas de la UI.
          
          REGLA DE FORMATO: Responde ÚNICAMENTE con un objeto JSON válido.` 
        },
        { role: 'user', content: user }
      ]
    })

    const rawContent = res.choices[0].message.content || "{}"
    
    // Limpieza de Markdown si el modelo lo incluye por error
    const cleanJson = rawContent.replace(/```json|```/g, "").trim()
    
    return JSON.parse(cleanJson)

  } catch (err: any) {
    const msg = err?.message || ''
    console.error(`[GROQ ERROR] Reintento ${4 - retries}/3. Error: ${msg.slice(0, 100)}`)

    // Si recibimos un Rate Limit, activamos el cooldown global
    if (msg.includes('rate') || msg.includes('429') || msg.includes('limit')) {
      console.warn("[GROQ] Rate limit alcanzado. Entrando en modo espera (5s).")
      cooldownUntil = Date.now() + 5000
    }

    if (retries <= 0) {
        console.error('[GROQ] Máximo de reintentos agotado. Devolviendo null para evitar crash.');
        return null;
    }

    // Backoff exponencial simple
    await sleep(1000 * (4 - retries))
    return callGroqJSON(system, user, retries - 1)
  }
}