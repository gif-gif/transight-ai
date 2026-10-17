import { localeInfo, type Locale } from '../i18n/locales';

export const siteLinks = {
  privacyContact: 'https://github.com/gif-gif/transight-ai/issues',
  repository: 'https://github.com/gif-gif/transight-ai',
  storeListing: 'https://chromewebstore.google.com/detail/transight-ai/aocmejffpcbcfnmbpiilnlikapmlhocm?utm_source=item-ow-cb',
} as const;

export function storeListingUrl(locale: Locale): string {
  const url = new URL(siteLinks.storeListing);
  url.searchParams.set('hl', localeInfo[locale].lang);
  return url.toString();
}
