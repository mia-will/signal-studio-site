import { supabase } from './supabase';
import { SITE_CONFIG } from '../config/sites';

export interface BrandTokenData {
  css: string;
  inlineStyle: string;
  fontHeadingName: string;
  fontBodyName: string;
}

function extractFontName(value: string | undefined): string {
  return value?.split(',')?.[0]?.trim()?.replace(/^['"]|['"]$/g, '') ?? '';
}

export async function getBrandTokenData(brandKey?: string): Promise<BrandTokenData> {
  const key = brandKey || SITE_CONFIG.brand_key;

  const { data, error } = await supabase
    .from('brand_tokens')
    .select('token_key, token_value')
    .eq('brand_key', key)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) {
    return { css: '', inlineStyle: '', fontHeadingName: '', fontBodyName: '' };
  }

  const tokens = data as { token_key: string; token_value: string }[];
  const map = Object.fromEntries(tokens.map((t) => [t.token_key, t.token_value]));
  const backgroundAlias =
    !map.color_background && map.color_background_base
      ? [{ token_key: 'color_background', token_value: map.color_background_base }]
      : [];
  const aliasTokens = tokens.flatMap((t) => {
    if (t.token_key === 'font_heading') return [t, { token_key: 'font-heading', token_value: t.token_value }];
    if (t.token_key === 'font_body') return [t, { token_key: 'font-body', token_value: t.token_value }];
    return [t];
  });
  const outputTokens = [...aliasTokens, ...backgroundAlias];

  const lines = outputTokens.map((t) => `  --${t.token_key}: ${t.token_value};`).join('\n');
  const css = `:root {\n${lines}\n}`;
  const inlineStyle = outputTokens.map((t) => `--${t.token_key}: ${t.token_value}`).join('; ');

  return {
    css,
    inlineStyle,
    fontHeadingName: extractFontName(map.font_heading),
    fontBodyName: extractFontName(map.font_body),
  };
}

export async function getBrandTokenCSS(brandKey?: string): Promise<string> {
  const { css } = await getBrandTokenData(brandKey);
  return css;
}
