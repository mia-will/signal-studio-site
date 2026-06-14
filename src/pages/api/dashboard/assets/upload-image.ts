import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../../lib/supabase-admin'
import sharp from 'sharp'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? ''
})

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type') ?? ''

  // Phase 2: confirmed save — receive JSON metadata and INSERT into media_assets
  if (contentType.includes('application/json')) {
    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return json({ error: 'Invalid JSON' }, 400)
    }

    const { file_path, image_url, alt_text, caption, asset_type, title, width, height, file_size_kb, session_id } = body as Record<string, unknown>

    if (!file_path || !image_url) return json({ error: 'file_path and image_url required' }, 400)

    const { data: asset, error } = await supabaseAdmin
      .from('media_assets')
      .insert({
        file_path,
        image_url,
        alt_text: alt_text ?? '',
        caption: caption ?? null,
        asset_type: asset_type ?? 'photo',
        title: title ?? null,
        width: width ?? null,
        height: height ?? null,
        file_size_kb: file_size_kb ?? null,
        status: 'published',
        tags: [],
        is_decorative: false
      })
      .select('id, file_path, image_url, alt_text, caption, asset_type, title, width, height, file_size_kb, created_at')
      .single()

    if (error) return json({ error: error.message }, 500)

    if (session_id) {
      await supabaseAdmin.from('chat_log').insert({
        session_id,
        role: 'user',
        content: JSON.stringify({ action: 'upload_image', after: asset }),
        page_path: '/dashboard/brand/assets',
        dashboard_role: 'admin'
      })
    }

    return json({ asset }, 200)
  }

  // Phase 1: receive file, compress with sharp, upload to storage, run Claude Vision
  let formData: FormData
  try { formData = await request.formData() } catch {
    return json({ error: 'Invalid form data' }, 400)
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return json({ error: 'No file provided' }, 400)

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  if (!allowedTypes.includes(file.type)) return json({ error: 'Unsupported file type' }, 400)

  const buffer = Buffer.from(await file.arrayBuffer())

  let compressed: Buffer
  let imgWidth: number | null = null
  let imgHeight: number | null = null

  try {
    const img = sharp(buffer)
    const meta = await img.metadata()
    imgWidth = meta.width ?? null
    imgHeight = meta.height ?? null

    compressed = await img.webp({ quality: 82 }).toBuffer()

    if (compressed.length > 153_600) {
      const q = Math.max(Math.floor(82 * 153_600 / compressed.length), 40)
      compressed = await sharp(buffer).webp({ quality: q }).toBuffer()
    }
  } catch {
    return json({ error: 'Image processing failed' }, 422)
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '')
  const storagePath = `uploads/${Date.now()}-${safeName}.webp`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('media')
    .upload(storagePath, compressed, { contentType: 'image/webp', upsert: false })

  if (uploadError) return json({ error: `Storage upload failed: ${uploadError.message}` }, 500)

  const supabaseUrl = (import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  const imageUrl = `${supabaseUrl}/storage/v1/object/public/media/${storagePath}`

  // Claude Vision for alt_text / caption suggestions
  let suggestions = { alt_text: '', caption: '' }
  try {
    const b64 = compressed.toString('base64')
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 400,
      thinking: { type: 'adaptive' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/webp', data: b64 } },
          { type: 'text', text: 'Provide alt text (under 125 chars, descriptive for accessibility) and a short editorial caption (1–2 sentences). Reply ONLY with valid JSON — no markdown, no explanation: {"alt_text":"...","caption":"..."}' }
        ]
      }]
    })
    const textBlock = msg.content.find(b => b.type === 'text')
    if (textBlock?.type === 'text') {
      const m = textBlock.text.match(/\{[\s\S]*?"alt_text"[\s\S]*?\}/)
      if (m) suggestions = JSON.parse(m[0])
    }
  } catch {
    // Vision suggestions are optional — proceed without
  }

  return json({
    file_path: storagePath,
    image_url: imageUrl,
    width: imgWidth,
    height: imgHeight,
    file_size_kb: Math.ceil(compressed.length / 1024),
    suggestions
  }, 200)
}
