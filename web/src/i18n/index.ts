import { en, type Dictionary } from './en';
import { zhCN } from './zh-cn';
import { zhTW } from './zh-tw';
import type { Locale } from './locales';
export * from './locales';
export type { Dictionary } from './en';
export const dictionaries = { en, 'zh-cn': zhCN, 'zh-tw': zhTW } satisfies Record<Locale, Dictionary>;
export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];
