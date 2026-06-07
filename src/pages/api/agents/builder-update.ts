import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../lib/supabase-admin'

// Fields the builder is allowed to update via the "Continue building" flow.
// Mirrors the safe-editable set in update.ts plus the fields collected by the builder prompt.
const ALLOWED_FIELDS = new Set([
  'name',
  'purpose',
  'trigger',
  'reads_from',
  'writes_to',
  'calls_external',
  'phase',
  'area',
  'can_it_break',
  'how_to_test',
  'notes',
  'source_url',
])

const VALID_TRIGGER_ON = new Set([
  'previous_step_complete',
  'schedule',
  'webhook',
  'manual',
])

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const { id, steps, ...rawFields } = body

  if (!id || typeof id !== 'string') {
    return json({ error: 'id is required' }, 400)
  }

  // Build the update payload from allowed fields only
  const updatePayload: Record<string, unknown> = {}
  for (const key of Object.keys(rawFields)) {
    if (ALLOWED_FIELDS.has(key)) updatePayload[key] = rawFields[key]
  }

  // Update agent fields if any were provided
  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabaseAdmin
      .from('agents_registry')
      .update(updatePayload)
      .eq('id', id)
    if (error) return json({ error: error.message }, 500)
  }

  // Append new workflow steps if provided
  let stepsInserted = 0

  if (Array.isArray(steps) && steps.length > 0) {
    // Look up the agent's linked workflow
    const { data: agentRow } = await supabaseAdmin
      .from('agents_registry')
      .select('workflow_id')
      .eq('id', id)
      .maybeSingle()

    if (agentRow?.workflow_id) {
      // Find the highest existing step_order so we append after it
      const { data: lastStep } = await supabaseAdmin
        .from('workflow_steps')
        .select('step_order')
        .eq('workflow_id', agentRow.workflow_id)
        .order('step_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const baseOrder = (lastStep?.step_order ?? 0) as number

      const stepRows = (steps as Record<string, unknown>[]).map((step, i) => ({
        workflow_id: agentRow.workflow_id,
        step_order: baseOrder + i + 1,
        name:
          typeof step.name === 'string' && step.name.trim()
            ? step.name.trim()
            : `Step ${baseOrder + i + 1}`,
        description:
          typeof step.description === 'string' ? step.description : null,
        trigger_on:
          typeof step.trigger_on === 'string' &&
          VALID_TRIGGER_ON.has(step.trigger_on)
            ? step.trigger_on
            : 'previous_step_complete',
        condition:
          typeof step.condition === 'string' && step.condition.trim()
            ? step.condition.trim()
            : null,
        requires_human_approval: step.requires_human_approval === true,
      }))

      const { error: stepsError } = await supabaseAdmin
        .from('workflow_steps')
        .insert(stepRows)

      if (!stepsError) stepsInserted = stepRows.length
    }
  }

  // Audit log
  const changedFields = Object.keys(updatePayload)
  await supabaseAdmin
    .from('build_history')
    .insert({
      built_what: `Updated agent id: ${id} via Continue Building`,
      decisions_made: [
        changedFields.length > 0
          ? `Fields updated: ${changedFields.join(', ')}`
          : 'No agent fields changed',
        stepsInserted > 0
          ? `${stepsInserted} new workflow step(s) added`
          : 'No new steps',
      ].join('. '),
      tables_changed: [
        'agents_registry',
        ...(stepsInserted > 0 ? ['workflow_steps'] : []),
      ],
    })
    .catch(() => {})

  return json({ success: true, steps_inserted: stepsInserted }, 200)
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
