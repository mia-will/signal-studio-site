import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

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

  const { email, site_slug, source, page_path, payload } = body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'A valid email address is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabase
    .from('form_submissions')
    .insert({
      email:     email.trim().toLowerCase(),
      site_slug: site_slug || 'remix',
      source:    source    || 'pathway_hero',
      page_path: page_path || '/',
      payload:   payload   ?? {},
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
