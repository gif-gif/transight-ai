// Keep the UI preference separate from provider settings and translation targets.
let preference = 'auto';
let catalogs;
let ready;
const listeners = new Set();
export const UI_LANGUAGES = Object.freeze(['auto', 'en', 'zh-CN', 'zh-TW', 'ja', 'ko']);
export const normalizeLanguage = value => UI_LANGUAGES.includes(value) ? value : 'auto';
export function resolveBrowserLanguage(value) {
  const parts = String(value).toLowerCase().replaceAll('_', '-').split('-');
  if (['ja', 'ko'].includes(parts[0])) return parts[0];
  if (parts[0] !== 'zh') return 'en';
  // Explicit script takes precedence over region (e.g. zh-Hans-HK).
  if (parts.includes('hant')) return 'zh-TW';
  if (parts.includes('hans')) return 'zh-CN';
  return parts.some(part => ['tw', 'hk', 'mo'].includes(part)) ? 'zh-TW' : 'zh-CN';
}
export const getLanguagePreference = () => preference;
export const getDisplayLanguage = () => preference === 'auto'
  ? resolveBrowserLanguage(chrome.i18n.getUILanguage()) : preference;
export function t(key, substitutions) {
  if (!catalogs) return chrome.i18n.getMessage(key, substitutions);
  const message = catalogs[getDisplayLanguage()][key]?.message || catalogs.en[key]?.message || '';
  const values = Array.isArray(substitutions) ? substitutions : [substitutions];
  return message.replace(/\$([1-9])/g, (_, index) => String(values[Number(index) - 1] ?? ''));
}
function applyPreference(value) {
  const next = normalizeLanguage(value);
  if (next === preference) return;
  preference = next;
  for (const listener of listeners) listener();
}
export function onLanguageChanged(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function initI18n() {
  if (!ready) ready = (async () => {
    const entries = await Promise.all([['en', 'en'], ['zh-CN', 'zh_CN'], ['zh-TW', 'zh_TW'], ['ja', 'ja'], ['ko', 'ko']].map(async ([language, directory]) => {
      const response = await fetch(chrome.runtime.getURL(`_locales/${directory}/messages.json`));
      if (!response.ok) throw new Error('Cannot load interface translations');
      return [language, await response.json()];
    }));
    catalogs = Object.fromEntries(entries);
    let changed = false;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.uiLanguage) {
        changed = true;
        applyPreference(changes.uiLanguage.newValue);
      }
    });
    const { uiLanguage } = await chrome.storage.local.get('uiLanguage');
    if (!changed) applyPreference(uiLanguage);
  })();
  return ready;
}
export async function setLanguagePreference(value) {
  await initI18n();
  const next = normalizeLanguage(value);
  await chrome.storage.local.set({ uiLanguage: next });
  applyPreference(next);
}
export function localizePage(root = document) {
  if (root.documentElement) root.documentElement.lang = getDisplayLanguage();
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const attribute of ['placeholder', 'aria-label', 'title']) {
    for (const element of root.querySelectorAll(`[data-i18n-${attribute}]`)) {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    }
  }
}

// Public copy only. Never include provider configuration in content-script payloads.
export function localeSnapshot() {
  return { language: getDisplayLanguage(), preference: getLanguagePreference(),
    messages: Object.fromEntries(Object.keys(catalogs.en).map(key => [key, t(key)])) };
}
