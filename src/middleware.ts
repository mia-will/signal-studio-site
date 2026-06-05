import { defineMiddleware } from 'astro:middleware';
import { supabase } from './lib/supabase';

const COOKIE_NAME = 'signal_preview';
const COOKIE_MAX_AGE = 86400;

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  if (url.pathname.startsWith('/dashboard')) {
    if (url.pathname !== '/dashboard/login') {
      const sessionCookie = context.cookies.get('dashboard_session');
      const adminSecret = import.meta.env.DASHBOARD_SECRET;
      const colletteSecret = import.meta.env.COLLETTE_SECRET;
      const validSecrets = [adminSecret, colletteSecret].filter(Boolean);
      if (!sessionCookie || !validSecrets.includes(sessionCookie.value)) {
        return context.redirect('/dashboard/login');
      }
    }
    return next();
  }

  const previewParam = url.searchParams.get('preview');

  if (previewParam === 'off') {
    context.cookies.delete(COOKIE_NAME, { path: '/' });
    context.locals.isPreview = false;
    return next();
  }

  if (previewParam !== null) {
    const { data } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'preview_token')
      .maybeSingle();

    if (data?.value && previewParam === data.value) {
      context.cookies.set(COOKIE_NAME, '1', {
        maxAge: COOKIE_MAX_AGE,
        path: '/',
        httpOnly: true,
      });
      context.locals.isPreview = true;
      return next();
    }
  }

  context.locals.isPreview = context.cookies.get(COOKIE_NAME)?.value === '1';
  return next();
});
