import { installScreenshot, SCREENSHOT_PAGE } from './shared/screenshot.js';
import { installSpeech } from './shared/speech.js';
import { openContextTranslation } from './shared/context-menu.js';
import { installSelection } from './shared/selection-background.js';
import { t, initI18n, onLanguageChanged } from './shared/i18n.js';
import { getSettings, permissionOrigin, validateSettings } from './shared/settings.js';
import { credentialAccess } from './shared/credential-access.js';
import { createCredentialStore } from './shared/credentials.js';
import { fetchModels, modelConnection } from './shared/models.js';
import { translate } from './shared/translator.js';

// Prevent injected scripts from reading local API credentials.
installSpeech();
const credentials = createCredentialStore(chrome.storage);
const storageReady = Promise.all([chrome.storage.local, chrome.storage.session].map(area =>
  area.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }))).then(() => credentials.migrate());
const languageReady = storageReady.then(initI18n);
installScreenshot(languageReady, t);
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

// All network requests share cancellation, including on-page translation and model discovery.
const activeRequests = new Set();
async function withRequest(signal, callback) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  activeRequests.add(controller);
  try { return await callback(controller.signal); }
  finally { activeRequests.delete(controller); signal?.removeEventListener('abort', cancel); }
}
function abortRequests() { for (const controller of activeRequests) controller.abort(); }
async function runTranslation(text, targetLanguage, signal, model, context, image, sourceLanguage) {
  return withRequest(signal, async requestSignal => {
    await languageReady;
    const settings = validateSettings(await getSettings());
    if (!await chrome.permissions.contains({ origins: [permissionOrigin(settings.baseUrl)] })) throw new Error(t('permissionMissing'));
    const chosen = model ?? settings.models[0];
    if (!settings.models.includes(chosen)) throw new Error(t('modelNotConfigured'));
    const apiKey = await credentials.resolve(settings.baseUrl);
    if (requestSignal.aborted) throw new Error(t('vaultLockedError'));
    return translate(text, { ...settings, apiKey, model: chosen, models: [chosen] }, targetLanguage, { signal: requestSignal, context, image, sourceLanguage });
  });
}

// Credentials are never returned in RPC responses. Only options can manage the
// vault; the isolated unlock frame gets status/unlock access only.
const modelJobs = new Map();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!credentialAccess(message, sender, chrome.runtime)) return false;
  const owner = sender.documentId || sender.url;
  if (message.type === 'CANCEL_MODELS') {
    modelJobs.get(owner)?.abort(); respond({ ok: true }); return false;
  }
  // Cancel requests immediately, not after PBKDF2 or storage awaits.
  if (message.type === 'VAULT_LOCK' || message.type === 'VAULT_RESET') abortRequests();
  (async () => {
    await languageReady;
    switch (message.type) {
      case 'VAULT_STATUS': return { vault: await credentials.status() };
      case 'VAULT_UNLOCK': return { vault: await credentials.unlock(message.password) };
      case 'VAULT_LOCK': return { vault: await credentials.lock() };
      case 'VAULT_RESET': return { vault: await credentials.reset() };
      case 'VAULT_SAVE': return { vault: await credentials.save(message.settings, message.password, message.confirmation) };
      case 'FETCH_MODELS': {
        modelJobs.get(owner)?.abort();
        const controller = new AbortController(); modelJobs.set(owner, controller);
        try {
          return await withRequest(controller.signal, async signal => {
            const connection = modelConnection(message.connection);
            if (!await chrome.permissions.contains({ origins: [permissionOrigin(connection.baseUrl)] })) throw new Error(t('permissionMissing'));
            const apiKey = await credentials.resolve(connection.baseUrl, connection.apiKey);
            if (signal.aborted) throw new Error(t('vaultLockedError'));
            return { models: await fetchModels({ ...connection, apiKey }, { signal }) };
          });
        } finally { if (modelJobs.get(owner) === controller) modelJobs.delete(owner); }
      }
    }
  })().then(result => respond({ ok: true, ...result })).catch(error => respond({ ok: false, error: error.message || t('vaultOperationFailed') }));
  return true;
});

const popupJobs = new Map();
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only our own extension pages may initiate requests; never trust page/content messages.
  if (sender.id !== chrome.runtime.id || !['src/options/options.html', 'src/popup/popup.html', SCREENSHOT_PAGE].some(path => sender.url?.split(/[?#]/)[0] === chrome.runtime.getURL(path))) return false;
  const owner = sender.documentId || sender.url;
  const key = `${owner}:${message?.id}`;
  if (message?.type === 'CANCEL_TRANSLATE') {
    popupJobs.get(key)?.abort(); popupJobs.delete(key); sendResponse({ ok: true }); return false;
  }
  if (message?.type !== 'TRANSLATE') return false;
  if ((message.image !== undefined || message.images !== undefined) && !['src/popup/popup.html', SCREENSHOT_PAGE].some(path => sender.url?.split(/[?#]/)[0] === chrome.runtime.getURL(path))) return false;
  if (message.id !== undefined && (typeof message.id !== 'string' || message.id.length > 80)) return false;
  const controller = new AbortController();
  if (message.id) { popupJobs.get(key)?.abort(); popupJobs.set(key, controller); }
  runTranslation(message.text, message.targetLanguage, controller.signal, message.model, message.context, message.images !== undefined ? message.images : message.image, message.sourceLanguage)
    .then(result => sendResponse({ ok: true, ...result }))
    .catch(error => sendResponse({ ok: false, error: error.message || t('translationFailed'), ...(error.code === 'AUTH_REQUIRED' ? { code: 'AUTH_REQUIRED' } : {}) }))
    .finally(() => { if (popupJobs.get(key) === controller) popupJobs.delete(key); });
  return true;
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  await languageReady;
  await openContextTranslation(info, tab);
});

installSelection(languageReady, runTranslation, () => credentials.status());
