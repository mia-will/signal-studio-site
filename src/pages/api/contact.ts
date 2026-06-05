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

  const { name, email, message, site_slug, source, page_path, payload } = body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'A valid email address is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const hasPayload = payload && typeof payload === 'object';
  if (!hasPayload && (!message || typeof message !== 'string' || message.trim().length < 2)) {
    return new Response(JSON.stringify({ error: 'A message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabase
    .from('form_submissions')
    .insert({
      site_slug: site_slug || 'signal_studio',
      source: source || 'footer_contact',
      email: email.trim().toLowerCase(),
      first_name: name?.trim() || payload?.first_name?.trim() || null,
      message: message?.trim() || null,
      page_path: page_path || '/',
      payload: payload ?? {},
      status: 'new',
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
