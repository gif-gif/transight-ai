import { LANGUAGES } from './settings.js';

// Use Google's public website-translation UI, not an undocumented translation API.
export function googleWebsiteTranslationUrl(pageUrl, targetLanguage) {
  if (!Object.hasOwn(LANGUAGES, targetLanguage)) throw new Error('invalidTarget');
  let page;
  try { page = new URL(pageUrl); } catch { throw new Error('websiteTranslationUnavailable'); }
  if (!['http:', 'https:'].includes(page.protocol) || page.username || page.password) {
    throw new Error('websiteTranslationUnavailable');
  }
  const destination = new URL('https://translate.google.com/translate');
  destination.searchParams.set('sl', 'auto');
  destination.searchParams.set('tl', targetLanguage);
  destination.searchParams.set('u', page.href);
  return destination.href;
}

export async function openWebsiteTranslation(targetLanguage, tabs = chrome.tabs) {
  const [tab] = await tabs.query({ active: true, currentWindow: true });
  // Do not read cookies, credentials, page content, or AI provider settings.
  return openPageTranslation(tab?.url, targetLanguage, tabs);
}

// Explicit source URL for content-script and right-click fallback views.
export async function openPageTranslation(pageUrl, targetLanguage, tabs = chrome.tabs) {
  return tabs.create({ url: googleWebsiteTranslationUrl(pageUrl, targetLanguage) });
}
