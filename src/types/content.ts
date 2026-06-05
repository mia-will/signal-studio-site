export interface Site {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  primary_domain: string | null;
  brand_key: string | null;
  logo_asset_id: string | null;
  linkedin_url: string | null;
  contact_email: string | null;
  footer_description: string | null;
  acknowledgement: string | null;
  cta_label: string | null;
  cta_url: string | null;
  meta_description: string | null;
  og_description: string | null;
}

export interface SitePage {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  url_path: string;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  robots: string | null;
  og_image_asset_id: string | null;
  site_slug: string;
}

export interface PageBlock {
  id: string;
  site_page_id: string;
  site_id: string | null;
  site_slug: string | null;
  block_type_key: string;
  sort_order: number;
  is_enabled: boolean;
  admin_label: string | null;
  section_key: string | null;
  anchor: string | null;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  cta_primary_label: string | null;
  cta_primary_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
  layout: string | null;
  layout_variant: string | null;
  source_table: string | null;
  source_filter: string | null;
  source_key: string | null;
  limit: number | null;
  form_embed_url: string | null;
  media_asset_id: string | null;
  props: Record<string, any>;
}

export interface Pathway {
  id: string;
  slug: string;
  sort_order: number | null;
  label: string | null;
  title: string | null;
  short_description: string | null;
  bullet_points: string[] | null;
  accent_colour: string | null;
  time_commitment_label: string | null;
  location_label: string | null;
  start_label: string | null;
  start_date: string | null;
  cta_label: string | null;
  cta_link: string | null;
  cta_secondary_label: string | null;
  cta_secondary_link: string | null;
  topic: string | null;
  audience: string | null;
  pathway_status?: 'coming_soon' | 'open' | 'complete';
}

export interface PageSEO {
  id: string;
  site_page_id: string;
  seo_title_override: string | null;
  seo_description_override: string | null;
  jsonld: any[];
  aeo_summary: string | null;
}

export interface NavItem {
  id: string;
  label: string;
  url: string;
  is_external: boolean;
  nav_group: string;
  footer_column: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
  children?: { label: string; url: string }[];
}

export interface MediaAsset {
  id: string;
  image_url: string;
  alt_text: string | null;
  title: string | null;
  width: number | null;
  height: number | null;
}

export interface OfferGroup {
  id: string;
  slug: string;
  site_slug: string;
  title: string;
  eyebrow: string | null;
  tagline: string | null;
  card_features: { label?: string; description?: string; detail?: string }[] | null;
  cta_label: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
  cta_tertiary_label: string | null;
  cta_tertiary_href: string | null;
  scope_tag: string | null;
  group_label: string | null;
  canonical_order: number | null;
  status: string | null;
  background: string | null;
  card_background: string | null;
  variant: string | null;
  steps?: { step_number: number; name: string; short_description?: string }[];
}

export interface OfferStep {
  id: string;
  name: string;
  slug: string;
  offer_group_id: string | null;
  canonical_order: number;
  hero_line: string | null;
  short_description: string | null;
  what_this_is: string | null;
  primary_problem: string | null;
  primary_outcome: string | null;
  who_its_for_situations: string[] | null;
  outcomes: string[] | null;
  how_it_works: string[] | null;
  entry_requirements: string | null;
  long_description: string | null;
  price_display: string | null;
  is_public: boolean;
  meta_title: string | null;
  meta_description: string | null;
}

export interface Offer {
  id: string;
  name: string;
  slug: string;
  hero_line: string | null;
  short_description: string | null;
  primary_outcome: string | null;
  offer_type: string | null;
  canonical_order: number;
  cta_label: string | null;
  cta_href?: string | null;
  price_display: string | null;
  eyebrow?: string | null;
  tagline?: string | null;
  group_label?: string | null;
  step_count?: number;
  first_step_description?: string | null;
}

export interface OfferExtended extends Offer {
  who_its_for_situations: string[] | null;
  outcomes: string[] | null;
  what_this_is: string | null;
  how_it_works: string[] | null;
  long_description: string | null;
  entry_requirements: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  published_at: string | null;
  category: string | null;
  reading_time_minutes: number | null;
  featured_image_asset_id: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
}

export interface Event {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  start_at: string | null;
  end_at: string | null;
  venue_name: string | null;
  suburb: string | null;
  state: string | null;
  registration_url: string | null;
  audience_track?: string | null;
  event_format?: string | null;
  featured_image_asset_id?: string | null;
  image_url?: string | null;
  image_position?: string | null;
}

export interface Testimonial {
  id: string;
  person_name: string | null;
  person_role: string | null;
  company_name: string | null;
  short_quote: string | null;
  quote: string | null;
  sort_order: number | null;
}

export interface FaqItem {
  id: string;
  faq_item_id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export interface CapabilityStage {
  stage_key: string;
  stage_number: number;
  label: string;
  summary: string | null;
  next_step_short: string | null;
  badge_label: string | null;
  badge_colour: string | null;
}

export interface RemixLocation {
  id: string;
  slug: string;
  name: string;
  status: string;
  region: string | null;
  is_active: boolean;
  sort_order: number | null;
}
