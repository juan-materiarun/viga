import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { Page } from 'playwright'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'viga-evidence'

export async function captureEvidence(
  page: Page,
  suiteId: string,
  stepId: string,
  fullPage: boolean = false, // FIX: Por defecto false para evitar "fideos"
  meta: Record<string, any> = {}
) {
  console.log(`[EVIDENCE] 📸 Capturando snapshot para ${stepId.slice(0, 4)}...`)
  const html = await page.content()
  const domHash = crypto.createHash('sha256').update(html).digest('hex')

  // FIX: Captura solo el viewport actual para que la IA vea con claridad
  // TIMEOUT PROTECTION: Race condition to ensure we don't hang forever
  const screenshotPromise = page.screenshot({ fullPage: fullPage })
  const timeoutPromise = new Promise<Buffer>((_, reject) => setTimeout(() => reject(new Error('Screenshot Timeout')), 10000))

  let screenshot: Buffer
  try {
    screenshot = await Promise.race([screenshotPromise, timeoutPromise])
    console.log(`[EVIDENCE] ✅ Screenshot capturado (${screenshot.length} bytes)`)
  } catch (e: any) {
    console.error(`[EVIDENCE] ⚠️ Screenshot falló: ${e.message}`)
    // Fallback to empty buffer regarding visual evidence, but proceed
    screenshot = Buffer.from('')
  }

  const basePath = `${suiteId}/${stepId}`

  // Subida de evidencia a Supabase (Parallelize for speed)
  console.log(`[EVIDENCE] ☁️ Subiendo a Supabase...`)
  await Promise.all([
    supabase.storage.from(BUCKET).upload(`${basePath}.png`, screenshot, { contentType: 'image/png', upsert: true }),
    supabase.storage.from(BUCKET).upload(`${basePath}.html`, html, { contentType: 'text/html', upsert: true }),
    supabase.storage.from(BUCKET).upload(`${basePath}.json`, JSON.stringify({ domHash, meta, ts: Date.now() }), { contentType: 'application/json', upsert: true })
  ]).catch(err => console.error(`[EVIDENCE] ❌ Upload error: ${err.message}`))
  console.log(`[EVIDENCE] ✅ Subida completa`)

  const { data: img } = supabase.storage.from(BUCKET).getPublicUrl(`${basePath}.png`)
  const { data: htmlUrl } = supabase.storage.from(BUCKET).getPublicUrl(`${basePath}.html`)
  const { data: metaUrl } = supabase.storage.from(BUCKET).getPublicUrl(`${basePath}.json`)

  return {
    domHash,
    screenshotUrl: img.publicUrl,
    htmlUrl: htmlUrl.publicUrl,
    metaUrl: metaUrl.publicUrl
  }
}