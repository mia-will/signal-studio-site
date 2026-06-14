import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '24', 10)))
  const assetType = url.searchParams.get('type') ?? null
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('media_assets')
    .select('id, file_path, image_url, alt_text, caption, asset_type, title, width, height, file_size_kb, created_at', { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (assetType) query = query.eq('asset_type', assetType)

  const { data: assets, error, count } = await query

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ assets: assets ?? [], total: count ?? 0, page, limit }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
