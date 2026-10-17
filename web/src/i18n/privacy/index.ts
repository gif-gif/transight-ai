import type { Locale } from '../locales';
import { enPrivacy, type PrivacyPolicy } from './en';
import { zhCNPrivacy } from './zh-cn';
import { jaPrivacy } from './ja';
import { koPrivacy } from './ko';
import { zhTWPrivacy } from './zh-tw';

// Keep section IDs aligned so language switching preserves the current section.
export const privacyUpdated = '2026-10-14';
const policies = { en: enPrivacy, ja: jaPrivacy, ko: koPrivacy, 'zh-cn': zhCNPrivacy, 'zh-tw': zhTWPrivacy } satisfies Record<Locale, PrivacyPolicy>;
export const getPrivacyPolicy = (locale: Locale): PrivacyPolicy => policies[locale];
