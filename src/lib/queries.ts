import { supabase } from './supabase';
import type {
  Site,
  SitePage,
  PageBlock,
  PageSEO,
  NavItem,
  MediaAsset,
  Offer,
  OfferExtended,
  OfferGroup,
  Post,
  Event,
  Testimonial,
  FaqItem,
  Pathway,
} from '../types/content';

export async function getPageData(siteSlug: string, pageSlug: string) {
  const { data, error } = await supabase
    .rpc('get_page_data', { p_site_slug: siteSlug, p_page_slug: pageSlug });

  if (error) throw error;
  if (data?.error) throw new Error(`get_page_data: ${data.error}`);

  return data as {
    site: Record<string, any>;
    page: Record<string, any>;
    blocks: Record<string, any>[];
    seo: Record<string, any>;
    tokens: { token_key: string; token_value: string }[];
    nav_header: Record<string, any>[];
    nav_footer: Record<string, any>[];
    media: Record<string, any>[];
  };
}

export async function getSite(siteSlug: string): Promise<Site | null> {
  const { data } = await supabase
    .from('sites')
    .select('id, slug, name, tagline, primary_domain, brand_key, logo_asset_id, linkedin_url, contact_email, footer_description, acknowledgement, cta_label, cta_url, meta_description, og_description')
    .eq('slug', siteSlug)
    .maybeSingle();

  return (data as Site) ?? null;
}

export async function getHomepagePage(
  siteSlug: string,
  pageSlug = 'home',
  isPreview = false
): Promise<SitePage | null> {
  let query = supabase
    .from('site_pages')
    .select('id, site_id, slug, title, url_path, is_published, robots, og_image_asset_id, site_slug')
    .eq('site_slug', siteSlug)
    .eq('slug', pageSlug);

  if (!isPreview) {
    query = query.eq('is_published', true);
  }

  const { data } = await query.maybeSingle();
  return (data as SitePage) ?? null;
}

export async function getEnabledBlocks(
  sitePageId: string,
  isPreview = false
): Promise<PageBlock[]> {
  let query = supabase
    .from('__page_blocks')
    .select(
      'id, site_page_id, site_id, site_slug, block_type_key, sort_order, is_enabled, admin_label, section_key, anchor, eyebrow, title, subtitle, body, cta_primary_label, cta_primary_href, cta_secondary_label, cta_secondary_href, layout, layout_variant, source_table, source_filter, source_key, "limit", form_embed_url, media_asset_id, props'
    )
    .eq('site_page_id', sitePageId);

  if (!isPreview) {
    query = query.eq('is_enabled', true);
  }

  const { data, error } = await query.order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data as PageBlock[];
}

export async function getPageSEO(sitePageId: string): Promise<PageSEO | null> {
  const { data } = await supabase
    .from('page_seo')
    .select('id, site_page_id, seo_title_override, seo_description_override, jsonld, aeo_summary')
    .eq('site_page_id', sitePageId)
    .maybeSingle();

  return (data as PageSEO) ?? null;
}

export async function getNavItems(
  siteSlug: string,
  navGroup: 'header' | 'footer'
): Promise<NavItem[]> {
  const shouldInjectOffers = siteSlug === 'signal_studio' && navGroup === 'header';

  const [navResult, offersResult] = await Promise.all([
    supabase
      .from('site_nav_items')
      .select('id, label, url, is_external, nav_group, footer_column, sort_order, open_in_new_tab')
      .eq('site_slug', siteSlug)
      .eq('nav_group', navGroup)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    shouldInjectOffers
      ? supabase
          .from('offer_groups')
          .select('slug, title')
          .eq('site_slug', siteSlug)
          .eq('status', 'active')
          .order('canonical_order', { ascending: true })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (navResult.error || !navResult.data) return [];

  const navItems = navResult.data as NavItem[];
  const offerGroups = (offersResult.data ?? []) as { slug: string; title: string }[];

  if (!offerGroups.length) return navItems;

  return navItems.map((item) =>
    item.url === '/services'
      ? {
          ...item,
          children: offerGroups.map((og) => ({
            label: og.title,
            url: `/offers/${og.slug}`,
          })),
        }
      : item
  );
}

export async function getMediaAssets(ids: string[]): Promise<Record<string, MediaAsset>> {
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from('media_assets')
    .select('id, image_url, alt_text, title, width, height')
    .in('id', ids);

  if (error || !data) return {};

  return Object.fromEntries(data.map((a: any) => [a.id, a as MediaAsset]));
}

export async function getOffers(siteSlug: string, limit = 4): Promise<Offer[]> {
  const { data: groups, error } = await supabase
    .from('offer_groups')
    .select('id, slug, title, eyebrow, tagline, cta_label, group_label, canonical_order')
    .eq('site_slug', siteSlug)
    .eq('status', 'active')
    .order('canonical_order', { ascending: true })
    .limit(limit);

  if (error || !groups) return [];

  const groupIds = groups.map((group: any) => group.id).filter(Boolean);
  if (groupIds.length === 0) return [];

  const { data: steps } = await supabase
    .from('offer_steps')
    .select('offer_group_id, short_description, canonical_order')
    .in('offer_group_id', groupIds)
    .eq('is_public', true)
    .order('canonical_order', { ascending: true });

  const stepsByGroup = new Map<string, any[]>();
  for (const step of steps ?? []) {
    const key = (step as any).offer_group_id;
    stepsByGroup.set(key, [...(stepsByGroup.get(key) ?? []), step]);
  }

  return groups.map((group: any) => {
    const groupSteps = stepsByGroup.get(group.id) ?? [];
    const firstStep = groupSteps[0] ?? null;
    return {
      id: group.id,
      name: group.title,
      slug: group.slug,
      hero_line: group.tagline,
      short_description: firstStep?.short_description ?? group.tagline,
      primary_outcome: null,
      offer_type: group.group_label,
      canonical_order: group.canonical_order,
      cta_label: group.cta_label,
      cta_href: `/offers/${group.slug}`,
      price_display: null,
      eyebrow: group.eyebrow,
      tagline: group.tagline,
      group_label: group.group_label,
      step_count: groupSteps.length,
      first_step_description: firstStep?.short_description ?? null,
    } as Offer;
  });
}

const OFFER_EXTENDED_FIELDS = 'id, name, slug, hero_line, short_description, long_description, primary_outcome, canonical_order, price_display, who_its_for_situations, outcomes, what_this_is, how_it_works, entry_requirements, meta_title, meta_description';

export async function getOffersExtended(siteSlug: string): Promise<OfferExtended[]> {
  const { data: groups } = await supabase
    .from('offer_groups')
    .select('id')
    .eq('site_slug', siteSlug)
    .eq('status', 'active');

  const groupIds = (groups ?? []).map((g: any) => g.id);
  if (groupIds.length === 0) return [];

  const { data, error } = await supabase
    .from('offer_steps')
    .select(OFFER_EXTENDED_FIELDS)
    .in('offer_group_id', groupIds)
    .eq('is_public', true)
    .order('canonical_order', { ascending: true });

  if (error || !data) return [];
  return data as OfferExtended[];
}

export async function getOfferBySlug(slug: string, siteSlug: string): Promise<OfferExtended | null> {
  const { data, error } = await supabase
    .from('offer_steps')
    .select(OFFER_EXTENDED_FIELDS)
    .eq('slug', slug)
    .eq('is_public', true)
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0] as OfferExtended;
}

export async function getPosts(siteSlug: string, limit = 3): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, slug, summary, published_at, category, reading_time_minutes, featured_image_asset_id')
    .contains('site_show', [siteSlug])
    .eq('status', 'published')
    .or('audience_primary.in.(appliers,both),audience_primary.is.null')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Fetch featured images for any posts that have them
  const imageIds = data.map((p: any) => p.featured_image_asset_id).filter(Boolean) as string[];
  const mediaMap: Record<string, { image_url: string; alt_text: string | null }> = {};

  if (imageIds.length > 0) {
    const { data: assets } = await supabase
      .from('media_assets')
      .select('id, image_url, alt_text')
      .in('id', imageIds);
    if (assets) {
      for (const a of assets as any[]) {
        mediaMap[a.id] = { image_url: a.image_url, alt_text: a.alt_text };
      }
    }
  }

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    published_at: row.published_at,
    category: row.category ?? null,
    reading_time_minutes: row.reading_time_minutes,
    featured_image_asset_id: row.featured_image_asset_id ?? null,
    featured_image_url: mediaMap[row.featured_image_asset_id]?.image_url ?? null,
    featured_image_alt: mediaMap[row.featured_image_asset_id]?.alt_text ?? null,
  })) as Post[];
}

export async function getEvents(siteSlug: string, limit = 3): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, slug, summary, start_at, end_at, venue_name, suburb, state, registration_url')
    .eq('show_on_signal_studio', true)
    .eq('publish_status', 'published')
    .eq('audience_track', 'appliers')
    .order('start_at', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as Event[];
}

export async function getHomepageEvents(limit = 3): Promise<Event[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, slug, summary, start_at, end_at, venue_name, suburb, state, registration_url, audience_track, event_format, featured_image_asset_id')
    .eq('show_on_remix', true)
    .eq('publish_status', 'published')
    .gte('start_at', now)
    .order('start_at', { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  const imageIds = data.map((event: any) => event.featured_image_asset_id).filter(Boolean);
  const imageMap: Record<string, string> = {};

  if (imageIds.length > 0) {
    const { data: assets } = await supabase
      .from('media_assets')
      .select('id, image_url')
      .in('id', imageIds);

    for (const asset of assets ?? []) {
      imageMap[(asset as any).id] = (asset as any).image_url;
    }
  }

  return data.map((event: any) => ({
    ...event,
    resolved_image_url: event.featured_image_asset_id ? imageMap[event.featured_image_asset_id] ?? null : null,
  })) as Event[];
}

export async function getHomepagePathways(siteId: string, limit = 3): Promise<Pathway[]> {
  const { data, error } = await supabase
    .from('pathways')
    .select('id, slug, sort_order, label, title, short_description, start_date, start_label, cta_label, cta_link, topic, audience, pathway_status, status')
    .eq('site_id', siteId)
    .in('status', ['active', 'live'])
    .eq('pathway_status', 'open')
    .order('start_date', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Pathway[];
}

// Temporary: fetches builder + both-track events including past, for layout review
export async function getBuilderEvents(limit = 8): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, slug, summary, start_at, end_at, venue_name, suburb, state, registration_url, audience_track, event_format')
    .eq('show_on_remix', true)
    .eq('publish_status', 'published')
    .in('audience_track', ['builders', 'both'])
    .order('start_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Event[];
}

export async function getRemixEvents(limit = 4): Promise<Event[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, slug, summary, start_at, end_at, venue_name, suburb, state, registration_url, audience_track, event_format')
    .eq('show_on_remix', true)
    .eq('publish_status', 'published')
    .gte('start_at', now)
    .order('start_at', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as Event[];
}

export async function getTestimonials(limit = 3): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from('testimonials')
    .select('id, person_name, person_role, company_name, short_quote, quote, sort_order')
    .eq('show_on_signal_studio', true)
    .order('sort_order', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error || !data) return [];
  return data as Testimonial[];
}

export async function getOfferGroups(siteSlug: string): Promise<OfferGroup[]> {
  const { data: groups } = await supabase
    .from('offer_groups')
    .select('id, slug, title, eyebrow, tagline, card_features, cta_label, cta_secondary_label, cta_secondary_href, cta_tertiary_label, cta_tertiary_href, scope_tag, canonical_order')
    .eq('site_slug', siteSlug)
    .eq('status', 'active')
    .order('canonical_order');

  if (!groups || groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);

  const { data: steps } = await supabase
    .from('offer_steps')
    .select('offer_group_id, step_number, name, short_description')
    .in('offer_group_id', groupIds)
    .eq('is_public', true)
    .order('step_number');

  return groups.map((group) => ({
    ...group,
    steps: (steps ?? []).filter((s) => s.offer_group_id === group.id),
  })) as unknown as OfferGroup[];
}

export async function getFaqItems(sitePageId: string): Promise<FaqItem[]> {
  const { data, error } = await supabase
    .from('__page_faq')
    .select('id, faq_item_id, sort_order, faq_items(id, question, answer)')
    .eq('site_page_id', sitePageId)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];

  return data
    .filter((row: any) => row.faq_items)
    .map((row: any) => ({
      id: row.faq_items.id,
      faq_item_id: row.faq_item_id,
      question: row.faq_items.question,
      answer: row.faq_items.answer,
      sort_order: row.sort_order,
    })) as FaqItem[];
}
