import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.PUBLIC_SUPABASE_ANON_KEY!
);

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, any>;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { email, first_name, audience, audience_type, audience_track, site_slug, source, page_path } = body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'A valid email address is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resolvedSiteSlug = site_slug || 'signal_studio';
  const resolvedSource = source || 'newsletter';
  const resolvedAudience = audience || audience_type || audience_track || null;

  const { error } = await supabase
    .from('form_submissions')
    .insert({
      site_slug: resolvedSiteSlug,
      source: resolvedSource,
      email: email.trim().toLowerCase(),
      first_name: first_name?.trim() || null,
      page_path: page_path || '/',
      payload: {
        audience: resolvedAudience,
        audience_type: audience_type || null,
        audience_track: audience_track || null,
      },
    });

  if (error) {
    return new Response(JSON.stringify({ error: 'Submission failed. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
