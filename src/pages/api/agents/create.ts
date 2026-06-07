import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../lib/supabase-admin'

const VALID_AREAS = new Set([
  'contact_management', 'email', 'marketing_flow', 'edm_build',
  'event_build', 'content', 'studio_pipeline', 'system_ops', 'finance', 'personal',
])

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const { name, purpose, trigger, reads_from, writes_to, calls_external, phase, area, can_it_break, how_to_test, steps } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return json({ error: 'name is required' }, 400)
  }

  const resolvedArea = (area && VALID_AREAS.has(area as string)) ? area as string : null
  if (area && !resolvedArea) {
    return json({ error: `Invalid area. Valid values: ${[...VALID_AREAS].join(', ')}` }, 400)
  }

  const { data: agent, error: agentError } = await supabaseAdmin
    .from('agents_registry')
    .insert({
      name: (name as string).trim(),
      type: 'agent',
      purpose: purpose ?? null,
      trigger: trigger ?? null,
      reads_from: Array.isArray(reads_from) ? reads_from : [],
      writes_to: Array.isArray(writes_to) ? writes_to : [],
      calls_external: Array.isArray(calls_external) ? calls_external : [],
      phase: typeof phase === 'number' ? Math.round(phase) : null,
      area: resolvedArea,
      can_it_break: can_it_break ?? null,
      how_to_test: how_to_test ?? null,
      status: 'to_build',
      security_approved: false,
      qa_status: 'not_tested',
    })
    .select('id, name')
    .maybeSingle()

  if (agentError) return json({ error: agentError.message }, 500)
  if (!agent) return json({ error: 'Insert failed — no data returned' }, 500)

  // Insert linked workflow
  let workflowId: string | null = null
  const { data: workflow } = await supabaseAdmin
    .from('workflow_registry')
    .insert({
      name: `${(name as string).trim()} Workflow`,
      purpose: purpose ?? null,
      area: resolvedArea,
      status: 'draft',
    })
    .select('id')
    .maybeSingle()

  if (workflow?.id) {
    workflowId = workflow.id
    await supabaseAdmin
      .from('agents_registry')
      .update({ workflow_id: workflowId })
      .eq('id', agent.id)
  }

  // Insert workflow_steps if provided
  const VALID_TRIGGER_ON = new Set(['previous_step_complete', 'schedule', 'webhook', 'manual'])
  let stepsInserted = 0

  if (workflowId && Array.isArray(steps) && steps.length > 0) {
    const stepRows = (steps as Record<string, unknown>[]).map((step, i) => ({
      workflow_id: workflowId,
      step_order: i + 1,
      name: typeof step.name === 'string' && step.name.trim() ? step.name.trim() : `Step ${i + 1}`,
      description: typeof step.description === 'string' ? step.description : null,
      trigger_on: typeof step.trigger_on === 'string' && VALID_TRIGGER_ON.has(step.trigger_on)
        ? step.trigger_on
        : 'previous_step_complete',
      condition: typeof step.condition === 'string' && step.condition.trim() ? step.condition.trim() : null,
      requires_human_approval: step.requires_human_approval === true,
    }))

    const { error: stepsError } = await supabaseAdmin
      .from('workflow_steps')
      .insert(stepRows)

    if (!stepsError) stepsInserted = stepRows.length
  }

  // Log to build_history
  const tablesChanged = ['agents_registry', 'workflow_registry']
  if (stepsInserted > 0) tablesChanged.push('workflow_steps')

  await supabaseAdmin.from('build_history').insert({
    built_what: `Registered agent: ${agent.name} (id: ${agent.id}) via Agent Builder`,
    decisions_made: `status=to_build, security_approved=false, qa_status=not_tested. Workflow linked: ${workflowId ?? 'none'}. Steps inserted: ${stepsInserted}`,
    tables_changed: tablesChanged,
  })

  return json({ success: true, agent_id: agent.id, workflow_id: workflowId, steps_inserted: stepsInserted }, 200)
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
