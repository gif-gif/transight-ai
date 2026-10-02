import { initI18n, onLanguageChanged, localeSnapshot, setLanguagePreference } from '../shared/i18n.js';
import { DEFAULT_SETTINGS, getSettings, MAX_TEXT_LENGTH } from '../shared/settings.js';
const standalone = new URLSearchParams(location.search).has('fallback');
document.documentElement.classList.toggle('standalone', standalone);
await initI18n();
const requestIds = new Set();
const view = new TransightTranslationView(document, {
  async translate(text, targetLanguage, model) {
    const id = crypto.randomUUID(); requestIds.add(id);
    try { return await chrome.runtime.sendMessage({ type: 'TRANSLATE', id, text, targetLanguage, model }); }
    finally { requestIds.delete(id); }
  },
  cancel() {
    for (const id of requestIds) chrome.runtime.sendMessage({ type: 'CANCEL_TRANSLATE', id }).catch(() => {});
    requestIds.clear();
  },
  openSettings: () => chrome.runtime.openOptionsPage(),
  async setLanguage(value) { await setLanguagePreference(value); return localeSnapshot(); },
  localized: () => { document.documentElement.lang = localeSnapshot().language; }
}, localeSnapshot(), await getSettings());
onLanguageChanged(() => view.setLocale(localeSnapshot()));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) view.applySettings({ ...DEFAULT_SETTINGS, ...changes.settings.newValue });
});
async function init() {
  const version = view.editVersion;
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
          if (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && ['text', 'search', 'url', 'email', 'tel'].includes(el.type))) return el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0);
          return window.getSelection()?.toString() || '';
        } });
        selection = results[0]?.result || '';
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
