import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Only publish canonical URLs and a sitemap once a real deployment URL is set.
const site = process.env.SITE_URL;
if (site) {
  const url = new URL(site);
  if (!['https:', 'http:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('SITE_URL must be an HTTP(S) origin, e.g. https://your-domain.com');
  }
}

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-cn', 'zh-tw'],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  integrations: site ? [sitemap({
    filter: (page) => new URL(page).pathname !== '/',
    i18n: { defaultLocale: 'en', locales: { en: 'en', 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW' } },
  })] : [],
});
