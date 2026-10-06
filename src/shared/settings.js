import { DEFAULT_SYSTEM_PROMPT, MAX_PROMPT_LENGTH } from './prompt.js';
import { t } from './i18n.js';
export const MAX_TEXT_LENGTH = 12000;
export const MAX_MODELS = 5;
export function selectedModels(input) {
  const values = input.models === undefined ? [input.model ?? ''] : input.models;
  if (!Array.isArray(values) || values.some(value => typeof value !== 'string')) throw new Error(t('invalidModel'));
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}
export function parseModelInput(value) {
  return [...new Set(String(value).split(/[,，\n]/).map(model => model.trim()).filter(Boolean))];
}
export const LANGUAGES = Object.freeze({
  'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: 'English', ja: '日本語',
  ko: '한국어', fr: 'Français', de: 'Deutsch', es: 'Español', ru: 'Русский', pt: 'Português'
});
export const DEFAULT_SETTINGS = Object.freeze({
  baseUrl: 'https://api.openai.com/v1', apiKey: '', model: '', targetLanguage: 'zh-CN',
  style: 'natural', consent: false, systemPrompt: DEFAULT_SYSTEM_PROMPT, selectionEnabled: true
});
export const STYLES = Object.freeze({ natural: '自然流畅', faithful: '忠实原文', professional: '专业严谨' });

export function normalizeBaseUrl(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error(t('invalidBase')); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error(t('httpsRequired'));
  }
  if (url.username || url.password || url.search || url.hash) throw new Error(t('invalidUrlParts'));
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  return url.href.replace(/\/+$/, '');
}

export function permissionOrigin(baseUrl) {
  const url = new URL(normalizeBaseUrl(baseUrl));
  // Chrome match patterns do not scope grants to a port.
  return `${url.protocol}//${url.hostname}/*`;
}

export function validateSettings(input) {
  const models = selectedModels(input);
  const settings = {
    models,
    baseUrl: normalizeBaseUrl(input.baseUrl), apiKey: String(input.apiKey ?? '').trim(),
    model: models[0] || '', targetLanguage: input.targetLanguage,
    style: input.style, consent: input.consent === true,
    systemPrompt: input.systemPrompt === undefined || (typeof input.systemPrompt === 'string' && !input.systemPrompt.trim()) ? DEFAULT_SYSTEM_PROMPT : input.systemPrompt
  };
  if (typeof settings.systemPrompt !== 'string' || settings.systemPrompt.length > MAX_PROMPT_LENGTH) throw new Error(t('invalidSystemPrompt'));
  if (!models.length || models.some(model => model.length > 200 || /[\r\n]/.test(model))) throw new Error(t('invalidModel'));
  if (models.length > MAX_MODELS) throw new Error(t('tooManyModels', String(MAX_MODELS)));
  if (/[\r\n]/.test(settings.apiKey)) throw new Error(t('invalidKey'));
  if (!Object.hasOwn(LANGUAGES, settings.targetLanguage)) throw new Error(t('invalidTarget'));
  if (!Object.hasOwn(STYLES, settings.style)) throw new Error(t('invalidStyle'));
  if (!settings.consent) throw new Error(t('consentRequired'));
  return settings;
}

export async function getSettings() {
  const [{ settings }, { targetLanguagePreference }, { selectionEnabled }] = await Promise.all([
    chrome.storage.local.get('settings'), chrome.storage.local.get('targetLanguagePreference'), chrome.storage.local.get('selectionEnabled')
  ]);
  const merged = { ...DEFAULT_SETTINGS, ...settings, apiKey: '', selectionEnabled: selectionEnabled !== false };
  if (typeof targetLanguagePreference === 'string' && Object.hasOwn(LANGUAGES, targetLanguagePreference)) merged.targetLanguage = targetLanguagePreference;
  const models = selectedModels(merged);
  return { ...merged, models, model: models[0] || '' };
}

// Keep the remembered target separate so changing it never overwrites provider settings
// or races with encrypted credential saves. Legacy settings remain the fallback.
export async function setTargetLanguage(value) {
  if (typeof value !== 'string' || !Object.hasOwn(LANGUAGES, value)) throw new Error(t('invalidTarget'));
  await chrome.storage.local.set({ targetLanguagePreference: value });
}

const LANGUAGE_MESSAGES = Object.freeze({
  'zh-CN': 'langZhCN', 'zh-TW': 'langZhTW', en: 'langEn', ja: 'langJa',
  ko: 'langKo', fr: 'langFr', de: 'langDe', es: 'langEs', ru: 'langRu', pt: 'langPt'
});
export function languageName(language) {
  return Object.hasOwn(LANGUAGE_MESSAGES, language) ? t(LANGUAGE_MESSAGES[language]) : language;
}

export function fillLanguages(select, selected) {
  select.replaceChildren();
  for (const value of Object.keys(LANGUAGES)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = languageName(value);
    select.append(option);
  }
  select.value = selected;
}

export async function setSelectionEnabled(value) {
  if (typeof value !== 'boolean') throw new Error(t('selectionSaveFailed'));
  await chrome.storage.local.set({ selectionEnabled: value });
}
