import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getAuth(cookies: { get: (name: string) => { value: string } | undefined }) {
  const session = cookies.get('dashboard_session')?.value
  const adminSecret = import.meta.env.DASHBOARD_SECRET
  const colletteSecret = import.meta.env.COLLETTE_SECRET
  if (!session) return null
  if (adminSecret && session === adminSecret) return 'admin'
  if (colletteSecret && session === colletteSecret) return 'coordinator'
  return null
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const dashboardRole = getAuth(cookies)
  if (!dashboardRole) return json({ error: 'Unauthorized' }, 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const VALID_CONTENT_SOURCE_VALUES = ['human', 'props']
  const contentSource = VALID_CONTENT_SOURCE_VALUES.includes(body.content_source as string)
    ? body.content_source
    : undefined

  const insertData: Record<string, unknown> = {
    title:            body.title ?? null,
    slug:             body.slug ?? null,
    start_at:         body.start_at ?? null,
    end_at:           body.end_at ?? null,
    price_amount:     body.price_amount ?? null,
    summary:          body.summary ?? null,
    description:      body.description ?? null,
    location_name:    body.location_name ?? null,
    location_address: body.location_address ?? null,
    audience_track:   body.audience_track ?? null,
    experience_level: body.experience_level ?? null,
    event_format:     body.event_format ?? null,
    pillar:           body.pillar ?? null,
    meta_title:       body.meta_title ?? null,
    meta_description: body.meta_description ?? null,
    publish_status:   body.publish_status === 'published' ? 'published' : 'draft',
  }

  if (contentSource !== undefined) {
    insertData.content_source = contentSource
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert(insertData)
    .select('id')
    .single()

  if (error) return json({ error: error.message }, 500)

  return json({ success: true, id: data.id })
}
