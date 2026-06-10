import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../lib/supabase-admin'

export const prerender = false

export const GET: APIRoute = async () => {
  const { data, error } = await supabaseAdmin
    .from('operating_principles')
    .select('*')
    .eq('is_active', true)
    .order('domain')
    .order('priority')

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
}
