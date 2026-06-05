import { createClient } from '@supabase/supabase-js';

// Server-side only — service role bypasses RLS.
// Never import this in browser-executed code.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const serviceKey  = import.meta.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
  global: {
    fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
  },
});
