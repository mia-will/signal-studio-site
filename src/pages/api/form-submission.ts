import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (body.payload && body.site_slug && body.source && email && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error } = await supabase
        .from('form_submissions')
        .insert({
          site_slug: body.site_slug,
          source: body.source,
          email,
          first_name: typeof body.first_name === 'string' ? body.first_name.trim() : null,
          page_path: body.page_path ?? null,
          payload: body.payload,
          status: body.status ?? null,
        });

      if (error) {
        return new Response(JSON.stringify({ error: 'Submission failed.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/handle-form-submission`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json().catch(() => ({}));

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to submit form.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
