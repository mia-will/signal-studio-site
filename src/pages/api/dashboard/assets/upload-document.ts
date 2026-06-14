import type { APIRoute } from 'astro'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type') ?? ''

  // Phase 2: confirmed save — receive JSON metadata and INSERT into docs
  if (contentType.includes('application/json')) {
    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return json({ error: 'Invalid JSON' }, 400)
    }

    const { file_path, title, document_type, description, file_size_kb, linked_to_event, linked_to_pathway, session_id } = body as Record<string, unknown>

    if (!file_path || !title || !document_type) {
      return json({ error: 'file_path, title, and document_type required' }, 400)
    }

    const { data: doc, error } = await supabaseAdmin
      .from('docs')
      .insert({
        file_path,
        title,
        document_type,
        description: description ?? null,
        file_size_kb: file_size_kb ?? null,
        linked_to_event: linked_to_event ?? null,
        linked_to_pathway: linked_to_pathway ?? null,
        status: 'active'
      })
      .select('id, file_path, title, document_type, description, file_size_kb, created_at')
      .single()

    if (error) return json({ error: error.message }, 500)

    if (session_id) {
      await supabaseAdmin.from('chat_log').insert({
        session_id,
        role: 'user',
        content: JSON.stringify({ action: 'upload_document', after: doc }),
        page_path: '/dashboard/brand/assets',
        dashboard_role: 'admin'
      })
    }

    return json({ doc }, 200)
  }

  // Phase 1: receive file, upload to documents/ storage bucket, return metadata
  let formData: FormData
  try { formData = await request.formData() } catch {
    return json({ error: 'Invalid form data' }, 400)
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return json({ error: 'No file provided' }, 400)

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  if (!allowedTypes.includes(file.type)) {
    return json({ error: 'Unsupported file type. Allowed: PDF, DOC, DOCX' }, 400)
  }

  if (file.size > 5_242_880) return json({ error: 'File exceeds 5MB limit' }, 413)

  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${Date.now()}-${safeName}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return json({ error: `Storage upload failed: ${uploadError.message}` }, 500)

  const supabaseUrl = (import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  const fileUrl = `${supabaseUrl}/storage/v1/object/public/documents/${storagePath}`

  return json({
    file_path: storagePath,
    file_url: fileUrl,
    file_size_kb: Math.ceil(file.size / 1024),
    original_name: file.name
  }, 200)
}
