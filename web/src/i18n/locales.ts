export const locales = ['zh-cn', 'zh-tw', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const localeInfo = {
  'zh-cn': { label: '简体中文', lang: 'zh-CN' },
  'zh-tw': { label: '繁體中文', lang: 'zh-TW' },
  en: { label: 'English', lang: 'en' },
} satisfies Record<Locale, { label: string; lang: string }>;

export function isLocale(value: string | null): value is Locale {
  return locales.some((locale) => locale === value);
}

export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const parts = language.toLowerCase().replaceAll('_', '-').split('-');
    if (parts[0] === 'en') return 'en';
    if (parts[0] !== 'zh') continue;
    if (parts.includes('hant')) return 'zh-tw';
    if (parts.includes('hans')) return 'zh-cn';
    return parts.some((part) => ['tw', 'hk', 'mo'].includes(part)) ? 'zh-tw' : 'zh-cn';
  }
  return defaultLocale;
}

export type Page = '' | 'guide' | 'privacy';
export function localePath(locale: Locale, page: Page = ''): string {
  return `/${locale}/${page ? `${page}/` : ''}`;
}
