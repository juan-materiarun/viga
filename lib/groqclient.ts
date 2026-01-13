import Groq from 'groq-sdk'

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3
].filter(Boolean) as string[]

if (GROQ_KEYS.length === 0) {
  throw new Error('❌ No GROQ API keys configured')
}

let keyIndex = 0

function getNextClient() {
  const key = GROQ_KEYS[keyIndex]
  keyIndex = (keyIndex + 1) % GROQ_KEYS.length
  return new Groq({ apiKey: key })
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

export async function groqChat({
  system,
  user,
  model = 'llama-3.3-70b-versatile',
  retries = 4
}: {
  system: string
  user: string
  model?: string
  retries?: number
}) {
  let lastError: any

  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = getNextClient()

    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })

      return completion.choices[0]?.message?.content || ''
    } catch (err: any) {
      lastError = err

      const status = err?.status || err?.response?.status

      // ⏳ RATE LIMIT
      if (status === 429) {
        const wait = 1000 * attempt
        console.warn(`⚠️ GROQ 429 – retry ${attempt} in ${wait}ms`)
        await sleep(wait)
        continue
      }

      // 🔥 OTRO ERROR
      console.error('❌ GROQ ERROR', err.message)
      break
    }
  }

  throw new Error(`Groq failed after retries: ${lastError?.message}`)
}
