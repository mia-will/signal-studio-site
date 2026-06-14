import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

const EVENT_SLOTS = new Set(['hero_media_asset_id', 'featured_image_asset_id', 'og_image_asset_id', 'promotional_image_asset_id'])
const PATHWAY_SLOTS = new Set(['feature_image_asset_id'])

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { asset_id, entity_type, entity_id, slot, session_id } = body as Record<string, unknown>

  if (!entity_id || !entity_type || !slot) {
    return json({ error: 'entity_id, entity_type, and slot required' }, 400)
  }

  if (entity_type === 'event' && !EVENT_SLOTS.has(slot as string)) {
    return json({ error: `Invalid slot for event. Allowed: ${[...EVENT_SLOTS].join(', ')}` }, 400)
  }
  if (entity_type === 'pathway' && !PATHWAY_SLOTS.has(slot as string)) {
    return json({ error: `Invalid slot for pathway. Allowed: ${[...PATHWAY_SLOTS].join(', ')}` }, 400)
  }
  if (entity_type !== 'event' && entity_type !== 'pathway') {
    return json({ error: 'entity_type must be "event" or "pathway"' }, 400)
  }

  const table = entity_type === 'event' ? 'events' : 'pathways'

  const { error } = await supabaseAdmin
    .from(table)
    .update({ [slot as string]: asset_id ?? null })
    .eq('id', entity_id)

  if (error) return json({ error: error.message }, 500)

  if (session_id) {
    const pagePath = entity_type === 'event'
      ? `/dashboard/events/${entity_id}`
      : `/dashboard/remix/pathways/${entity_id}`

    await supabaseAdmin.from('chat_log').insert({
      session_id,
      role: 'user',
      content: JSON.stringify({ action: 'link_asset', entity_type, entity_id, slot, asset_id }),
      page_path: pagePath,
      dashboard_role: 'admin'
    })
  }

  return json({ ok: true }, 200)
}
