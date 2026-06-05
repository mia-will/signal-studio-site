import { getPageData } from '../../lib/queries';
import type { MediaAsset, NavItem, PageBlock, PageSEO, Site, SitePage } from '../../types/content';

const SITE_SLUG = 'michelle';

type TokenRow = { token_key: string; token_value: string };

function tokenMap(tokens: TokenRow[]) {
  return Object.fromEntries(tokens.map((token) => [token.token_key, token.token_value]));
}

function buildTokenCSS(tokens: TokenRow[]) {
  const map = tokenMap(tokens);
  const backgroundAlias =
    !map.color_background && map.color_background_base
      ? [{ token_key: 'color_background', token_value: map.color_background_base }]
      : [];
  const aliasTokens = tokens.flatMap((token) => {
    if (token.token_key === 'font_heading') {
      return [token, { token_key: 'font-heading', token_value: token.token_value }];
    }
    if (token.token_key === 'font_body') {
      return [token, { token_key: 'font-body', token_value: token.token_value }];
    }
    return [token];
  });
  const lines = [...aliasTokens, ...backgroundAlias]
    .map((token) => `  --${token.token_key}: ${token.token_value};`)
    .join('\n');

  return lines ? `:root {\n${lines}\n}` : '';
}

function normalizeJsonLd(jsonld: unknown) {
  if (!jsonld) return [];
  return Array.isArray(jsonld) ? jsonld : [jsonld];
}

export async function loadMichellePage(pageSlug: string, pageLabel: string, isPreview = false) {
  const data = await getPageData(SITE_SLUG, pageSlug);
  const site = data.site as Site | null;
  const page = data.page as SitePage | null;
  const seo = data.seo as PageSEO | null;
  const tokens = data.tokens ?? [];
  const tokensByKey = tokenMap(tokens);
  const allBlocks = (data.blocks ?? []) as PageBlock[];
  const blocks = allBlocks.filter((block) => isPreview || block.is_enabled);
  const mediaAssets = Object.fromEntries(
    (data.media ?? []).map((asset) => [asset.id, asset as MediaAsset])
  );

  if (!site?.name) throw new Error(`${pageLabel}: missing sites.name for Michelle site`);
  if (!site?.primary_domain) throw new Error(`${pageLabel}: missing sites.primary_domain for Michelle site`);
  if (!page?.id) throw new Error(`${pageLabel}: missing site_pages row for slug=${pageSlug}`);
  if (!page.url_path) throw new Error(`${pageLabel}: missing site_pages.url_path for slug=${pageSlug}`);
  if (!isPreview && !page.is_published) throw new Error(`${pageLabel}: site_pages.is_published is false`);
  if (!tokens.length) throw new Error(`${pageLabel}: missing brand_tokens for brand_key=michelle_williams`);
  if (!page.robots && !tokensByKey.robots_default) {
    throw new Error(`${pageLabel}: missing robots value on page and brand_tokens.robots_default`);
  }

  return {
    site,
    page,
    blocks,
    seo,
    navHeader: (data.nav_header ?? []) as NavItem[],
    navFooter: (data.nav_footer ?? []) as NavItem[],
    tokens: tokensByKey,
    mediaAssets,
    rawTokenCSS: buildTokenCSS(tokens),
    canonicalUrl: page.canonical_url || `https://${site.primary_domain}${page.url_path}`,
    robots: page.robots ?? tokensByKey.robots_default,
    jsonld: normalizeJsonLd(seo?.jsonld),
  };
}
