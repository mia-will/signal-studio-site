import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../lib/supabase-admin'

// ── ALLOWLIST ──────────────────────────────────────────────────────────────
// Only these fields can be updated through this route.
// Sensitive fields (cronitor_key, agent_key, api_keys_referenced, security fields,
// tokens, secrets, credentials) are NOT on this list and will be rejected.
//
// Future edit forms should map their inputs to this set only.
// To add a new editable field, add it here AND ensure it is safe for dashboard use.

const ALLOWED_FIELDS = new Set([
  'name',
  'purpose',
  'status',
  'phase',
  'function_group',
  'area',
  'trigger',
  'action',
  'why',
  'workflow_id',
  'requires_human_approval_for',
  'reads_from',
  'writes_to',
  'calls_external',
  'how_to_test',
  'can_it_break',
  'notes',
  'source_system',
  'source_url',
  'log_url',
  'edit_url',
])

// Fields explicitly rejected regardless of allowlist — belt-and-suspenders.
const BLOCKED_FIELDS = new Set([
  'id',
  'agent_key',
  'cronitor_key',
  'cronitor_monitor',
  'created_at',
  'updated_at',
  'last_run',
  'last_status',
  'last_tested',
  'security_approved',
  'qa_status',
  'qa_last_tested',
  'qa_signed_off_by',
  'allowed_read_tables',
  'forbidden_tables',
  'connected_to',
  'decision_ids',
  'function_name',
  'lives_in',
  'type',
])

export const POST: APIRoute = async ({ request }) => {
  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body — expected JSON' }, 400)
  }

  // ── Resolve agent ID ──────────────────────────────────────────────────────
  // Accept either id (UUID) or agent_key (slug). One is required.
  const rawId  = body.id
  const rawKey = body.agent_key

  if (!rawId && !rawKey) {
    return json({ error: 'id or agent_key is required' }, 400)
  }
  if (rawId  && typeof rawId  !== 'string') return json({ error: 'id must be a string' }, 400)
  if (rawKey && typeof rawKey !== 'string') return json({ error: 'agent_key must be a string' }, 400)

  // ── Extract and validate fields ───────────────────────────────────────────
  // Remove id and agent_key from the update payload — they are lookup keys only.
  const { id, agent_key, ...rawFields } = body

  if (Object.keys(rawFields).length === 0) {
    return json({ error: 'No fields provided to update' }, 400)
  }

  // Reject any blocked field immediately — do not partially accept.
  const blocked = Object.keys(rawFields).filter(k => BLOCKED_FIELDS.has(k))
  if (blocked.length > 0) {
    return json({ error: `Field(s) not allowed: ${blocked.join(', ')}` }, 400)
  }

  // Reject any field not on the allowlist.
  const disallowed = Object.keys(rawFields).filter(k => !ALLOWED_FIELDS.has(k))
  if (disallowed.length > 0) {
    return json({
      error: `Field(s) not on safe editable list: ${disallowed.join(', ')}`,
      allowed_fields: [...ALLOWED_FIELDS],
    }, 400)
  }

  // Build the validated update payload — only keys that passed both checks.
  const updatePayload: Record<string, unknown> = {}
  for (const key of Object.keys(rawFields)) {
    if (ALLOWED_FIELDS.has(key)) updatePayload[key] = rawFields[key]
  }

  // ── Execute update ────────────────────────────────────────────────────────
  let query = supabaseAdmin
    .from('agents_registry')
    .update(updatePayload)
    .select('id, name, agent_key, status, updated_at')

  if (rawId) {
    query = query.eq('id', rawId as string)
  } else {
    query = query.eq('agent_key', rawKey as string)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    return json({ error: error.message }, 500)
  }

  if (!data) {
    return json({ error: 'Agent not found' }, 404)
  }

  return json({ success: true, agent: data }, 200)
}

// ── Helper ────────────────────────────────────────────────────────────────

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
