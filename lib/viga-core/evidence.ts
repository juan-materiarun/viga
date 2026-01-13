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
  meta: Record<string, any> = {}
) {
  const html = await page.content()
  const domHash = crypto.createHash('sha256').update(html).digest('hex')

  const screenshot = await page.screenshot({ fullPage: true })

  const basePath = `${suiteId}/${stepId}`

  await supabase.storage.from(BUCKET).upload(
    `${basePath}.png`,
    screenshot,
    { contentType: 'image/png', upsert: true }
  )

  await supabase.storage.from(BUCKET).upload(
    `${basePath}.html`,
    html,
    { contentType: 'text/html', upsert: true }
  )

  await supabase.storage.from(BUCKET).upload(
    `${basePath}.json`,
    JSON.stringify({ domHash, meta, ts: Date.now() }),
    { contentType: 'application/json', upsert: true }
  )

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
