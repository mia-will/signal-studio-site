// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

/** @type {Record<string, string>} */
const siteUrls = {
  remix: 'https://theremix.au',
  signal_studio: 'https://thesignalstudio.au',
  michelle: 'https://michellewilliams.au',
};

const siteUrl = process.env.PUBLIC_SITE_URL
  ?? siteUrls[process.env.SITE_SLUG ?? 'signal_studio']
  ?? siteUrls.signal_studio;

export default defineConfig({
  site: siteUrl,
  output: 'server',
  adapter: netlify(),
  integrations: [sitemap()],
});
