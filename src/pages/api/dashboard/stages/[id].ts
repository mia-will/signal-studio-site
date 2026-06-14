import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

const ALLOWED_FIELDS = ['result_heading', 'result_summary', 'primary_cta_label', 'primary_cta_url', 'next_step_short', 'next_step_href']

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getAuth(cookies: { get: (name: string) => { value: string } | undefined }): 'admin' | 'coordinator' | null {
  const session = cookies.get('dashboard_session')?.value
  const adminSecret = import.meta.env.DASHBOARD_SECRET
  const colletteSecret = import.meta.env.COLLETTE_SECRET
  if (!session) return null
  if (adminSecret && session === adminSecret) return 'admin'
  if (colletteSecret && session === colletteSecret) return 'coordinator'
  return null
}

export const PATCH: APIRoute = async ({ request, params, cookies }) => {
  const dashboardRole = getAuth(cookies)
  if (!dashboardRole) return json({ error: 'Unauthorized' }, 401)
  if (dashboardRole !== 'admin') return json({ error: 'Admin only' }, 403)

  const { id } = params
  if (!id) return json({ error: 'Missing id' }, 400)

  let body: { field: string; value: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { field, value } = body
  if (!field || !ALLOWED_FIELDS.includes(field)) {
    return json({ error: 'Field not allowed' }, 400)
  }

  const previousRes = await supabaseAdmin
    .from('capability_stages')
    .select(field)
    .eq('id', id)
    .maybeSingle()

  const previousValue = previousRes.data?.[field] ?? null

  const { error } = await supabaseAdmin
    .from('capability_stages')
    .update({ [field]: value })
    .eq('id', id)

  if (error) return json({ error: error.message }, 500)

  await supabaseAdmin.from('chat_log').insert({
    session_id: crypto.randomUUID(),
    role: 'user',
    content: JSON.stringify({
      action: 'inline_edit',
      table: 'capability_stages',
      record_id: id,
      field,
      before: previousValue,
      after: value,
    }),
    page_path: `/dashboard/settings/stages`,
    dashboard_role: dashboardRole,
  })

  return json({ success: true, updated: { field, value } })
}
