import { readFileSync } from 'node:fs';
const catalogs = Object.fromEntries(['en', 'zh_CN', 'zh_TW', 'ja', 'ko'].map(locale => [locale,
  JSON.parse(readFileSync(new URL(`../_locales/${locale}/messages.json`, import.meta.url), 'utf8'))
]));
// Model Chrome's exact locale -> base locale -> default locale lookup in unit tests.
// The browser smoke suite additionally verifies real chrome.i18n behavior.
export function mockChromeI18n(locale = 'zh-CN') {
  const normalized = locale.replaceAll('-', '_');
  globalThis.chrome = { i18n: {
    getUILanguage: () => locale,
    getMessage(key, substitutions = []) {
      const catalog = catalogs[normalized] || catalogs[normalized.split('_')[0]] || catalogs.en;
      const values = Array.isArray(substitutions) ? substitutions : [substitutions];
      return (catalog[key]?.message ?? catalogs.en[key]?.message ?? '').replace(/\$([1-9])/g, (_, index) => values[Number(index) - 1] ?? '');
    }
  } };
}
export { catalogs };
