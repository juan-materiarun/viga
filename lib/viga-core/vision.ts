import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function analyzeScreenshot(imageUrl: string, reasoning: string) {
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
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ]
  })

  return res.choices[0].message.content
}