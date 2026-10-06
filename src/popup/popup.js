import { initI18n, onLanguageChanged, localeSnapshot, setLanguagePreference } from '../shared/i18n.js';
import { getSettings, setTargetLanguage, MAX_TEXT_LENGTH } from '../shared/settings.js';
const standalone = new URLSearchParams(location.search).has('fallback');
document.documentElement.classList.toggle('standalone', standalone);
await initI18n();
const requestIds = new Set();
let selectedContext, selectedText;
async function getVaultStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'VAULT_STATUS' });
  if (!response?.ok) throw new Error();
  return response.vault;
}
const initialVault = await getVaultStatus().catch(() => null);
const view = new TransightTranslationView(document, {
  vault: initialVault, getVaultStatus, unlockUrl: chrome.runtime.getURL('src/unlock/unlock.html'),
  async translate(text, targetLanguage, model, images, sourceLanguage) {
    const id = crypto.randomUUID(); requestIds.add(id);
    try { return await chrome.runtime.sendMessage({ type: 'TRANSLATE', id, text, targetLanguage, model, images, sourceLanguage, context: !images?.length && text === selectedText ? selectedContext : undefined }); }
    finally { requestIds.delete(id); }
  },
  cancel() {
    for (const id of requestIds) chrome.runtime.sendMessage({ type: 'CANCEL_TRANSLATE', id }).catch(() => {});
    requestIds.clear();
  },
  setTargetLanguage,
  settingsUrl: chrome.runtime.getURL('src/options/options.html'),
  openSettings: () => chrome.runtime.openOptionsPage(),
  async setLanguage(value) { await setLanguagePreference(value); return localeSnapshot(); },
  localized: () => { document.documentElement.lang = localeSnapshot().language; }
}, localeSnapshot(), await getSettings());
onLanguageChanged(() => view.setLocale(localeSnapshot()));
chrome.storage.onChanged.addListener((changes, area) => {
  if ((area === 'session' && changes.credentialSession) || (area === 'local' && (changes.credentialVault || changes.settings))) getVaultStatus().then(vault => view.setVault(vault)).catch(() => {});
  if (area === 'local' && (changes.settings || changes.targetLanguagePreference)) getSettings().then(settings => view.applySettings(settings)).catch(() => view.statusKey('readConfigFailed', true));
});
async function init() {
  const version = view.editVersion;
  if (!standalone) {
    const draft = await chrome.runtime.sendMessage({ type: 'SCREENSHOT_TAKE' }).catch(() => null);
    if (draft?.ok && draft.draft && view.editVersion === version) { view.setDraft(draft.draft); return; }
  }
  let selection = '';
  if (standalone) {
    const { contextDraft } = await chrome.storage.session.get('contextDraft');
    await chrome.storage.session.remove('contextDraft'); selection = contextDraft || ''; view.statusKey('fallback');
  } else {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
          const el = document.activeElement;
          const context = { title: document.title.slice(0, 500), summary: (document.querySelector('meta[name="description"]')?.content || '').slice(0, 1500) };
          if (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && ['text', 'search', 'url', 'email', 'tel'].includes(el.type))) return { text: el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0), context };
          return { text: window.getSelection()?.toString() || '', context };
        } });
        selection = results[0]?.result?.text || '';
        selectedText = selection.trim(); selectedContext = results[0]?.result?.context;
      }
    } catch { /* Restricted pages still support manual input. */ }
  }
  if (selection && view.editVersion === version) {
    if (selection.length > MAX_TEXT_LENGTH) view.statusKey('selectionTooLong', true);
    else view.input(selection);
  }
}
init().catch(() => view.statusKey('readConfigFailed', true));
window.addEventListener('pagehide', () => view.dispose());
