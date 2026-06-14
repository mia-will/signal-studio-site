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

  const VALID_PATHWAY_STATUS = ['coming_soon', 'open']
  const pathwayStatus = VALID_PATHWAY_STATUS.includes(body.pathway_status as string)
    ? body.pathway_status
    : 'coming_soon'

  const insertData: Record<string, unknown> = {
    title:             body.title ?? null,
    slug:              body.slug ?? null,
    short_description: body.short_description ?? null,
    overview:          body.overview ?? null,
    who_its_for:       body.who_its_for ?? null,
    what_youll_do:     body.what_youll_do ?? null,
    pathway_type:      body.pathway_type ?? null,
    delivery_mode:     body.delivery_mode ?? null,
    duration_weeks:    body.duration_weeks ?? null,
    price_amount:      body.price_amount ?? null,
    audience:          body.audience ?? null,
    capability_level:  body.capability_level ?? null,
    pathway_status:    pathwayStatus,
  }

  const { data, error } = await supabaseAdmin
    .from('pathways')
    .insert(insertData)
    .select('id')
    .single()

  if (error) return json({ error: error.message }, 500)

  return json({ success: true, id: data.id })
}
