import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../lib/supabase-admin'

export const PATCH: APIRoute = async ({ request }) => {
  let body: { id?: unknown; notes?: unknown }

  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id, notes } = body

  if (!id || typeof id !== 'string') {
    return new Response(JSON.stringify({ error: 'id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (typeof notes !== 'string') {
    return new Response(JSON.stringify({ error: 'notes must be a string' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { error } = await supabaseAdmin
    .from('contacts_crm')
    .update({ notes })
    .eq('id', id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
