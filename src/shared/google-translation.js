import { getSettings, LANGUAGES } from './settings.js';

// Deliberate entry-point limit; never silently truncate a user's source text.
export const MAX_GOOGLE_TEXT_LENGTH = 5000;
export function googleTextTranslationUrl({ text, targetLanguage, sourceLanguage = 'auto', uiLanguage = 'en' }) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('googleTextRequired');
  if (text.length > MAX_GOOGLE_TEXT_LENGTH) throw new Error('googleTextTooLong');
  if (!Object.hasOwn(LANGUAGES, targetLanguage)) throw new Error('invalidTarget');
  if (sourceLanguage !== 'auto' && !Object.hasOwn(LANGUAGES, sourceLanguage)) throw new Error('googleTranslationFailed');
  const url = new URL('https://translate.google.com/');
  url.searchParams.set('hl', ['en', 'zh-CN', 'zh-TW', 'ja', 'ko'].includes(uiLanguage) ? uiLanguage : 'en');
  url.searchParams.set('sl', sourceLanguage);
  url.searchParams.set('tl', targetLanguage);
  url.searchParams.set('text', text);
  url.searchParams.set('op', 'translate');
  return url.href;
}

// This is a public Google Translate page, not a translation API. Only a click
// calls this function; text is never fetched, uploaded, or translated here.
export async function openGoogleTextTranslation(request, services = {}) {
  const settings = await (services.getSettings || getSettings)();
  if (settings.googleTranslationEnabled === false) throw new Error('googleTranslationDisabled');
  const url = googleTextTranslationUrl(request);
  await (services.tabs || chrome.tabs).create({ url });
}
