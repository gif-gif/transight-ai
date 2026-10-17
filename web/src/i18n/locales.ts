export const locales = ['zh-cn', 'zh-tw', 'en', 'ja', 'ko'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const localeInfo = {
  'zh-cn': { label: '简体中文', lang: 'zh-CN', og: 'zh_CN' },
  'zh-tw': { label: '繁體中文', lang: 'zh-TW', og: 'zh_TW' },
  en: { label: 'English', lang: 'en', og: 'en_US' },
  ja: { label: '日本語', lang: 'ja', og: 'ja_JP' },
  ko: { label: '한국어', lang: 'ko', og: 'ko_KR' },
} satisfies Record<Locale, { label: string; lang: string; og: string }>;

export function isLocale(value: string | null): value is Locale {
  return locales.some((locale) => locale === value);
}

export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const parts = language.toLowerCase().replaceAll('_', '-').split('-');
    if (parts[0] === 'en') return 'en';
    if (parts[0] === 'ja') return 'ja';
    if (parts[0] === 'ko') return 'ko';
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
