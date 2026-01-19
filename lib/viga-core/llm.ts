import Groq from 'groq-sdk'

const keys = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3
].filter(Boolean) as string[]

if (keys.length === 0) throw new Error('❌ No hay llaves de Groq configuradas.');

let pointer = 0
let cooldownUntil = 0

// Modificamos getClient para que pueda recibir una key específica o rotar
function getClient(specificKey?: string) {
  const key = specificKey || keys[pointer]
  if (!specificKey) {
    pointer = (pointer + 1) % keys.length
    console.log(`[VIGA-METRALLETA] Rotación Automática - Slot: ${pointer + 1}`);
  } else {
    console.log(`[VIGA-METRALLETA] Usando Key Inyectada`);
  }
  return new Groq({ apiKey: key })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function callGroqJSON(
  system: string,
  user: string,
  specificKey?: string, // Cambiamos retries por specificKey para evitar el error de TS
  retries = 3
): Promise<any> {
  if (Date.now() < cooldownUntil) {
    const waitTime = cooldownUntil - Date.now()
    await sleep(waitTime)
  }

  try {
    const groq = getClient(specificKey)
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', 
      temperature: 0.2, 
      response_format: { type: 'json_object' },
      messages: [
        { 
          role: 'system', 
          content: `${system} 
          
          DIRECTIVAS DE QA SENIOR:
          1. Genera casos de prueba lógicos: "Cambiar idioma", "Probar modo oscuro", "Validar formulario con error".
          2. No uses nombres de botones técnicos.
          3. Devuelve siempre un JSON válido.` 
        },
        { role: 'user', content: user }
      ]
    })

    const rawContent = res.choices[0].message.content || "{}"
    const cleanJson = rawContent.replace(/```json|```/g, "").trim()
    return JSON.parse(cleanJson)

  } catch (err: any) {
    const msg = err?.message || ''
    
    if (msg.includes('rate') || msg.includes('429')) {
      console.warn("[GROQ] Rate limit! Rotando key...");
      cooldownUntil = Date.now() + 3000 
    }

    if (retries <= 0) return null;

    await sleep(1500);
    // Pasamos los parámetros en el nuevo orden
    return callGroqJSON(system, user, specificKey, retries - 1)
  }
}