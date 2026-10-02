import type { Locale } from '../locales';
import { enPrivacy, type PrivacyPolicy } from './en';
import { zhCNPrivacy } from './zh-cn';
import { zhTWPrivacy } from './zh-tw';

// Keep section IDs aligned so language switching preserves the current section.
export const privacyUpdated = '2026-10-02';
const policies = { en: enPrivacy, 'zh-cn': zhCNPrivacy, 'zh-tw': zhTWPrivacy } satisfies Record<Locale, PrivacyPolicy>;
export const getPrivacyPolicy = (locale: Locale): PrivacyPolicy => policies[locale];
