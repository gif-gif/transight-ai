import { openContextTranslation } from './shared/context-menu.js';
import { installSelection } from './shared/selection-background.js';
import { t, initI18n, onLanguageChanged } from './shared/i18n.js';
import { getSettings, permissionOrigin, validateSettings } from './shared/settings.js';
import { translate } from './shared/translator.js';

// Prevent injected scripts from reading local API credentials.
const storageReady = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const languageReady = storageReady.then(initI18n);
onLanguageChanged(refreshContextMenu);
languageReady.then(refreshContextMenu).catch(console.error);
let menuRefresh = Promise.resolve();
function refreshContextMenu() {
  menuRefresh = menuRefresh.then(async () => {
    await languageReady;
    await chrome.action.setTitle({ title: t('brand') });
    await chrome.contextMenus.removeAll();
    await new Promise(resolve => {
      chrome.contextMenus.create({ id: 'yijian-translate', title: t('contextMenu'), contexts: ['selection'] }, resolve);
    });
  }).catch(console.error);
  return menuRefresh;
}
chrome.runtime.onInstalled.addListener(refreshContextMenu);
chrome.runtime.onStartup.addListener(refreshContextMenu);

async function runTranslation(text, targetLanguage, signal, model) {
  await languageReady;
  const settings = validateSettings(await getSettings());
  if (!await chrome.permissions.contains({ origins: [permissionOrigin(settings.baseUrl)] })) {
    throw new Error(t('permissionMissing'));
  }
  const chosen = model ?? settings.models[0];
  if (!settings.models.includes(chosen)) throw new Error(t('modelNotConfigured'));
  if (signal?.aborted) throw new Error(t('translationFailed'));
  return translate(text, { ...settings, model: chosen, models: [chosen] }, targetLanguage, { signal });
}

const popupJobs = new Map();
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only our own extension pages may initiate requests; never trust page/content messages.
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('src/'))) return false;
  const owner = sender.documentId || sender.url;
  const key = `${owner}:${message?.id}`;
  if (message?.type === 'CANCEL_TRANSLATE') {
    popupJobs.get(key)?.abort(); popupJobs.delete(key); sendResponse({ ok: true }); return false;
  }
  if (message?.type !== 'TRANSLATE') return false;
  if (message.id !== undefined && (typeof message.id !== 'string' || message.id.length > 80)) return false;
  const controller = new AbortController();
  if (message.id) { popupJobs.get(key)?.abort(); popupJobs.set(key, controller); }
  runTranslation(message.text, message.targetLanguage, controller.signal, message.model)
    .then(result => sendResponse({ ok: true, ...result }))
    .catch(error => sendResponse({ ok: false, error: error.message || t('translationFailed') }))
    .finally(() => { if (popupJobs.get(key) === controller) popupJobs.delete(key); });
  return true;
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  await languageReady;
  await openContextTranslation(info, tab);
});

installSelection(languageReady, runTranslation);
