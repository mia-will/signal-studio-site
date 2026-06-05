import { supabase } from '../../lib/supabase';

const MICHELLE_SITE_ID = '9292ce76-87cc-4204-afc7-2fbcc5d1bbb5';

function normaliseHost(host: string): string {
  return host.split(',')[0].trim().replace(/^www\./, '').split(':')[0];
}

export async function isMichelleRequest(request: Request, url: URL, siteSlug?: string): Promise<boolean> {
  if (siteSlug === 'michelle') return true;

  const forwardedHost = request.headers.get('x-forwarded-host');
  const directHost = request.headers.get('host');
  const hostHeader = forwardedHost || directHost || url.hostname;
  if (!hostHeader) return false;

  const { data, error } = await supabase
    .from('sites')
    .select('primary_domain')
    .eq('id', MICHELLE_SITE_ID)
    .maybeSingle();

  if (error) throw new Error(`Michelle route: failed to load primary domain: ${error.message}`);
  return data?.primary_domain === normaliseHost(hostHeader);
}
