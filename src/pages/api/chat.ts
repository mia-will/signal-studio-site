import type { APIRoute } from 'astro'
import { supabaseAdmin as supabase } from '../../lib/supabase-admin'

const ADMIN_PROMPT = `You are the Signal OS assistant. You have full access to Signal OS data including CRM contacts, clients, agents, automations, governance, finance, events, pathways, campaigns, and sites. You can read data and propose write actions for Michelle to approve. Always check Supabase before answering — never guess or invent data.`

const COORDINATOR_PROMPT = `You are the Signal OS assistant for Collette. You have visibility across the full Signal OS including: CRM contacts, events, pathways, campaigns, strategy direction, client projects (Signal Studio clients — Spell, Paddock, and pipeline), agents, and governance. This is intentional — full transparency so Collette understands how the operation runs and where the business is headed.

You can take action on: events, campaigns, pathways, agent registration for events, and contact updates at the event/pathway level.

You do NOT write to: client project records, finance, governance, or agent configuration. If asked to action those areas, say "I can show you that but changes there need to go through Michelle."

Always be practical and action-oriented. When Collette asks to create or update something, confirm what you're about to do before writing to Supabase.`

async function buildContext(page: string): Promise<string> {
  const today = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const parts: string[] = [`Today is ${today}.`]

  if (page.includes('/crm')) {
    const [totalRes, buildersRes, appliersRes, bothRes] = await Promise.all([
      supabase.from('contacts_crm').select('*', { count: 'exact', head: true }),
      supabase.from('contacts_crm').select('*', { count: 'exact', head: true }).eq('audience_track', 'builder'),
      supabase.from('contacts_crm').select('*', { count: 'exact', head: true }).eq('audience_track', 'applier'),
      supabase.from('contacts_crm').select('*', { count: 'exact', head: true }).eq('audience_track', 'both'),
    ])
    parts.push(
      `CRM context: ${totalRes.count ?? '?'} total contacts.` +
      ` Builders: ${buildersRes.count ?? '?'}, Appliers: ${appliersRes.count ?? '?'}, Both: ${bothRes.count ?? '?'}.`
    )
  }

  return parts.join(' ')
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const role = cookies.get('dashboard_role')?.value ?? 'admin'

  let body: { messages: { role: string; content: string }[]; pageContext?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages, pageContext = '' } = body
  const basePrompt = role === 'coordinator' ? COORDINATOR_PROMPT : ADMIN_PROMPT
  const context = await buildContext(pageContext)
  const systemPrompt = `${basePrompt}\n\n${context}`

  const apiKey = import.meta.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  })

  if (!upstream.ok) {
    const err = await upstream.text()
    return new Response(JSON.stringify({ error: err }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
