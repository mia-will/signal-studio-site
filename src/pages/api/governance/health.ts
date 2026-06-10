import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../lib/supabase-admin'

export const prerender = false

export const GET: APIRoute = async () => {
  const [
    liveNoSecRes,
    liveNoQaRes,
    noRlsRes,
    overdueRes,
    openIncRes,
    openSecRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('agents_registry')
      .select('id', { count: 'exact', head: true })
      .in('status', ['live', 'active'])
      .or('security_approved.is.null,security_approved.eq.false'),
    supabaseAdmin
      .from('agents_registry')
      .select('id', { count: 'exact', head: true })
      .in('status', ['live', 'active'])
      .not('qa_status', 'eq', 'pass'),
    supabaseAdmin.rpc('count_public_tables_without_rls'),
    supabaseAdmin
      .from('data_governance')
      .select('id', { count: 'exact', head: true })
      .lt('review_due', new Date().toISOString()),
    supabaseAdmin
      .from('incident_log')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null),
    supabaseAdmin
      .from('security_checks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
  ])

  return new Response(JSON.stringify({
    liveWithoutSecurity: liveNoSecRes.count ?? 0,
    liveWithoutQA:       liveNoQaRes.count ?? 0,
    tablesWithoutRLS:    noRlsRes.data ?? 0,
    overdueReviews:      overdueRes.count ?? 0,
    openIncidents:       openIncRes.count ?? 0,
    openSecurityChecks:  openSecRes.count ?? 0,
  }), { headers: { 'Content-Type': 'application/json' } })
}
