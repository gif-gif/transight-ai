import { UI_LANGUAGES, t, localeSnapshot, setLanguagePreference, onLanguageChanged } from './i18n.js';
import { getSettings, selectedModels } from './settings.js';

export function sitePattern(url) {
  try { const parsed = new URL(url); return /^https?:$/.test(parsed.protocol) ? `${parsed.protocol}//${parsed.hostname}/*` : null; }
  catch { return null; }
}
export function publicSettings(settings) {
  return { model: settings.model, models: selectedModels(settings), consent: settings.consent === true, targetLanguage: settings.targetLanguage };
}
export function installSelection(ready, runTranslation, vaultStatus = async () => ({ state: 'empty' })) {
  const jobs = new Map();
  let queue = Promise.resolve(), resources;
  const serial = fn => { const result = queue.then(fn); queue = result.catch(() => {}); return result; };
  // All ordinary sites are enabled by the manifest; still honor Chrome's permissions.
  const enabled = async pattern => pattern && await chrome.permissions.contains({ origins: [pattern] });
  const send = (tabId, message) => chrome.tabs.sendMessage(tabId, message).catch(() => {});
  async function broadcast(type, extra = {}) {
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(async tab => {
      const active = await enabled(sitePattern(tab.url));
      await send(tab.id, active ? { type, ...extra } : { type: 'SELECTION_DISABLED' });
    }));
  }
  async function reconcile() {
    await ready;
    // Migrate from the previous per-site version. Static manifest scripts now own
    // injection, so old persistent registrations and allowlists must be removed.
    const legacy = (await chrome.scripting.getRegisteredContentScripts()).filter(item => item.id.startsWith('transight-selection-')).map(item => item.id);
    if (legacy.length) await chrome.scripting.unregisterContentScripts({ ids: legacy });
    await chrome.storage.local.remove('selectionOrigins');
    for (const [key, job] of jobs) if (!await enabled(job.pattern)) { job.controller.abort(); jobs.delete(key); }
    await broadcast('SELECTION_SETTINGS', { settings: publicSettings(await getSettings()) });
  }
  async function assets() {
    if (!resources) resources = Promise.all(['src/popup/popup.html', 'src/shared/ui.css', 'src/popup/popup.css'].map(async path => (await fetch(chrome.runtime.getURL(path))).text())).then(([html, ui, popup]) => ({
      // Only packaged static extension markup is parsed, never provider/page input.
      html: html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''),
      css: ui.replace(':root', '.translation-view') + '\n' + popup
    }));
    return resources;
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || typeof message?.type !== 'string' || !message.type.startsWith('SELECTION_')) return false;
    const content = sender.tab?.id != null && Number.isInteger(sender.frameId) && sender.frameId >= 0 && sitePattern(sender.url);
    if (!content) return false;
    const owner = `${sender.tab.id}:${sender.documentId || sender.frameId}`;
    const key = `${owner}:${JSON.stringify(message.model ?? '')}`;
    // Establish ordering before asynchronous permission/storage checks. A close or
    // newer selection must also cancel a request that has not started fetching yet.
    let job;
    if (content && message.type === 'SELECTION_TRANSLATE') {
      if (message.model !== undefined && (typeof message.model !== 'string' || message.model.length > 200)) return false;
      if (typeof message.id !== 'string' || message.id.length > 80) return false;
      jobs.get(key)?.controller.abort();
      job = { controller: new AbortController(), pattern: sitePattern(sender.url), owner, id: message.id };
      jobs.set(key, job);
    }
    if (content && message.type === 'SELECTION_CANCEL') {
      for (const [jobKey, pending] of jobs) {
        if (pending.owner === owner && pending.id === message.id) { pending.controller.abort(); jobs.delete(jobKey); }
      }
    }
    (async () => {
      await ready;
      const pattern = sitePattern(sender.url);
      if (!await enabled(pattern)) throw new Error(t('selectionUnavailable'));
      switch (message.type) {
        case 'SELECTION_INIT': return { ...(await assets()), locale: localeSnapshot(), settings: publicSettings(await getSettings()), vault: await vaultStatus() };
        case 'SELECTION_VAULT_STATUS': return { vault: await vaultStatus() };
        case 'SELECTION_LANGUAGE':
          if (!UI_LANGUAGES.includes(message.value)) throw new Error(t('selectionUnavailable'));
          await setLanguagePreference(message.value); return { locale: localeSnapshot() };
        case 'SELECTION_OPTIONS': await chrome.runtime.openOptionsPage(); return {};
        case 'SELECTION_CANCEL': return {};
        case 'SELECTION_TRANSLATE': {
          if (job.controller.signal.aborted) return {};
          return await runTranslation(message.text, message.targetLanguage, job.controller.signal, message.model);
        }
        default: throw new Error(t('selectionUnavailable'));
      }
    })().then(result => respond({ ok: true, ...result })).catch(error => respond({ ok: false, error: error.message || t('translationFailed') })).finally(() => { if (job && jobs.get(key) === job) jobs.delete(key); });
    return true;
  });
  chrome.tabs.onRemoved.addListener(tabId => { for (const [key, job] of jobs) if (key.startsWith(`${tabId}:`)) { job.controller.abort(); jobs.delete(key); } });
  chrome.permissions.onRemoved.addListener(() => serial(reconcile).catch(console.error));
  chrome.runtime.onStartup.addListener(() => serial(reconcile).catch(console.error));
  chrome.runtime.onInstalled.addListener(() => serial(reconcile).catch(console.error));
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.settings) ready.then(async () => broadcast('SELECTION_SETTINGS', { settings: publicSettings(await getSettings()) })).catch(() => {}); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if ((area === 'session' && changes.credentialSession) || (area === 'local' && (changes.credentialVault || changes.settings))) {
      ready.then(async () => broadcast('SELECTION_VAULT', { vault: await vaultStatus() })).catch(() => {});
    }
  });
  onLanguageChanged(() => broadcast('SELECTION_LOCALE', { locale: localeSnapshot() }).catch(() => {}));
  ready.then(() => serial(reconcile)).catch(console.error);
}
