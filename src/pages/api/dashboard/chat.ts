import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../lib/supabase-admin'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function fetchContext(pagePath: string): Promise<string> {
  if (pagePath.startsWith('/dashboard/events')) {
    const { data } = await supabaseAdmin
      .from('events')
      .select('id, title, start_at, publish_status')
      .order('start_at', { ascending: false })
      .limit(5)
    return JSON.stringify(data ?? [])
  }
  if (pagePath.startsWith('/dashboard/remix/pathways')) {
    const { data } = await supabaseAdmin
      .from('pathways')
      .select('id, title, pathway_status, price_amount')
    return JSON.stringify(data ?? [])
  }
  if (pagePath.startsWith('/dashboard/crm')) {
    const [totalRes, subsRes, tracksRes] = await Promise.all([
      supabaseAdmin.from('contacts_crm').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('contacts_crm').select('*', { count: 'exact', head: true }).eq('subscriber', true),
      supabaseAdmin.from('contacts_crm').select('audience_track'),
    ])
    const trackCounts: Record<string, number> = {}
    for (const row of tracksRes.data ?? []) {
      const t = (row.audience_track as string | null) ?? 'none'
      trackCounts[t] = (trackCounts[t] ?? 0) + 1
    }
    return JSON.stringify({
      total: totalRes.count ?? 0,
      subscribers: subsRes.count ?? 0,
      by_track: trackCounts,
    })
  }
  if (pagePath.startsWith('/dashboard/agents')) {
    const { data } = await supabaseAdmin.from('agents_registry').select('status')
    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      const s = (row.status as string | null) ?? 'unknown'
      counts[s] = (counts[s] ?? 0) + 1
    }
    return JSON.stringify(counts)
  }
  return 'No specific context for this page.'
}

export const POST: APIRoute = async ({ request }) => {
  let body: {
    message: string
    history: { role: 'user' | 'assistant'; content: string }[]
    page_path: string
    session_id: string
    attachments?: unknown[]
  }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const { message, history, page_path, session_id } = body
  if (!message || !page_path || !session_id) {
    return json({ error: 'Missing required fields' }, 400)
  }

  // Form-fill mode placeholder
  if (
    page_path.startsWith('/dashboard/events/new') ||
    page_path.startsWith('/dashboard/remix/pathways/new')
  ) {
    return json({ response: 'Form-fill mode coming soon.' })
  }

  const contextJson = await fetchContext(page_path)

  const systemPrompt = `You are Signal OS, the operational AI for The Signal Studio dashboard. You help Michelle manage her business — events, pathways, contacts, and agents.

You have read-only access to live data. You can answer questions, surface insights, and suggest actions. You cannot make changes directly yet — that is Phase 2.

Current page: ${page_path}
Current data context:
${contextJson}

Be concise and direct. No filler. If you don't know something, say so.`

  const apiKey = import.meta.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500)
  }

  const messages = [
    ...(history ?? []),
    { role: 'user', content: message },
  ]

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
      system: systemPrompt,
      messages,
    }),
  })

  if (!upstream.ok) {
    const err = await upstream.text()
    return json({ error: err }, 502)
  }

  const responseData = await upstream.json() as {
    content: { type: string; text: string }[]
  }
  const assistantText =
    responseData.content.find((b) => b.type === 'text')?.text ?? 'No response.'

  await supabaseAdmin.from('chat_log').insert([
    { session_id, role: 'user', content: message, page_path, dashboard_role: 'admin' },
    { session_id, role: 'assistant', content: assistantText, page_path, dashboard_role: 'admin' },
  ])

  return json({ response: assistantText })
}
