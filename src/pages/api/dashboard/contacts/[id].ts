import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

const ALLOWED_FIELDS = ['first_name', 'last_name', 'organisation', 'job_title', 'notes', 'tags']

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

export const PATCH: APIRoute = async ({ request, params, cookies }) => {
  const dashboardRole = getAuth(cookies)
  if (!dashboardRole) return json({ error: 'Unauthorized' }, 401)

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
    .from('contacts_crm')
    .select(field)
    .eq('id', id)
    .maybeSingle()

  const previousValue = previousRes.data?.[field] ?? null

  const { error } = await supabaseAdmin
    .from('contacts_crm')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return json({ error: error.message }, 500)

  await supabaseAdmin.from('chat_log').insert({
    session_id: crypto.randomUUID(),
    role: 'user',
    content: JSON.stringify({
      action: 'inline_edit',
      table: 'contacts_crm',
      record_id: id,
      field,
      before: previousValue,
      after: value,
    }),
    page_path: `/dashboard/crm/${id}`,
    dashboard_role: dashboardRole,
  })

  return json({ success: true, updated: { field, value } })
}
