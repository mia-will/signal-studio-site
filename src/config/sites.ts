export const SITE_CONFIGS: Record<string, { site_id: string; site_slug: string; brand_key: string; domain: string }> = {
  signal_studio: {
    site_id: 'dd906ea1-4a95-4806-ab7a-c15c17e311dc',
    site_slug: 'signal_studio',
    brand_key: 'signal_studio',
    domain: 'thesignalstudio.au',
  },
  remix: {
    site_id: '182a399d-ac31-4a2a-9fb0-38844eadeef4',
    site_slug: 'remix',
    brand_key: 'the_remix',
    domain: 'theremix.au',
  },
  michelle: {
    site_id: '9292ce76-87cc-4204-afc7-2fbcc5d1bbb5',
    site_slug: 'michelle',
    brand_key: 'michelle_williams',
    domain: 'michellewilliams.au',
  },
};

export const CURRENT_SITE: string = import.meta.env.SITE_SLUG || 'signal_studio';
export const SITE_CONFIG = SITE_CONFIGS[CURRENT_SITE] ?? SITE_CONFIGS.signal_studio;
