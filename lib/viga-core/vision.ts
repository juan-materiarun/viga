import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function analyzeScreenshot(imageUrl: string, reasoning: string) {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un Senior QA Automation con ojo clínico. 
          Analiza la screenshot basándote en el razonamiento previo del agente.
          Determina:
          1. ¿Se cumplió la intención? (ej. si llenó un input, ¿aparece el texto?).
          2. ¿Hay errores visuales evidentes (overlays bloqueantes, alerts de error en rojo)?
          3. ¿La UI cambió de forma lógica?
          
          Responde de forma concisa (máximo 25 palabras) indicando el estado real del flujo.`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Razonamiento del agente: ${reasoning}` },
            { 
              type: 'image_url', 
              image_url: { 
                url: imageUrl,
                detail: 'low' // <--- ESTO ES LO QUE TE SALVA EL BOLSILLO Y LOS TOKENS
              } 
            }
          ]
        }
      ],
      max_tokens: 100 // Limitamos la respuesta para ahorrar aún más
    })

    return res.choices[0].message.content
  } catch (error: any) {
    // Si OpenAI nos bloquea por límite de velocidad (429), no rompemos el proceso
    if (error.status === 429) {
      console.error("⚠️ OpenAI Rate Limit detectado. Omitiendo validación visual.");
      return "Validación visual omitida por límite de API (429). El agente continúa por lógica de código.";
    }
    
    console.error("🚨 Error crítico en analyzeScreenshot:", error.message);
    return `Error en visión: ${error.message}`;
  }
}