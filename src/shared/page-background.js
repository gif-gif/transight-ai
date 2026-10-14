import { getSettings, LANGUAGES, selectedModels } from './settings.js';
import { localeSnapshot, t } from './i18n.js';
import { PAGE_LIMITS, validatePageBlocks } from './page-translation.js';

export function installPageTranslation(ready, resolveConfig, runBatch) {
  const jobs = new Map();
  let queue = Promise.resolve();
  const serial = fn => { const next = queue.then(fn); queue = next.catch(() => {}); return next; };
  const cancelOwner = (owner, id) => {
    for (const [key, job] of jobs) if (job.owner === owner && (!id || job.id === id)) { job.controller.abort(); jobs.delete(key); }
  };
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || typeof message?.type !== 'string' || !message.type.startsWith('AI_PAGE_')) return false;
    const content = Number.isInteger(sender.tab?.id) && sender.frameId === 0 && /^https?:\/\//.test(sender.url || '');
    const entry = Number.isInteger(sender.tab?.id) && /^https?:\/\//.test(sender.url || '');
    const popup = sender.url?.split(/[?#]/)[0] === chrome.runtime.getURL('src/popup/popup.html');
    if (message.type === 'AI_PAGE_OPEN') {
      if (!entry && !popup) return false;
      (async () => {
        await ready;
        if (!Object.hasOwn(LANGUAGES, message.targetLanguage)) throw new Error('invalidTarget');
        let tab;
        try {
          tab = entry ? sender.tab : Number.isInteger(message.tabId) ? await chrome.tabs.get(message.tabId) : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
        } catch { throw new Error('aiPageUnavailable'); }
        if (!Number.isInteger(tab?.id) || !/^https?:\/\//.test(tab.url || '') || tab.pendingUrl) throw new Error('aiPageUnavailable');
        const url = new URL(tab.url);
        if (url.hostname === 'chromewebstore.google.com' || (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) throw new Error('aiPageUnavailable');
        const settings = await getSettings();
        let provider = '';
        try { provider = new URL(settings.baseUrl).host; } catch { /* Invalid settings are reported on start. */ }
        const show = () => chrome.tabs.sendMessage(tab.id, { type: 'AI_PAGE_SHOW', targetLanguage: message.targetLanguage, locale: localeSnapshot(), model: selectedModels(settings)[0] || '', provider }, { frameId: 0 });
        // Reuse a live controller. After an extension reload an old isolated-world
        // flag may remain even though its runtime listener is no longer connected.
        const existing = await show().catch(() => null);
        if (existing?.ok) return {};
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, func: () => {
            globalThis.__transightPageTranslation?.dispose?.();
            delete globalThis.__transightPageTranslation;
          } });
          await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, files: ['src/shared/request-id.js', 'src/content/page-engine.js', 'src/content/page-translation.js'] });
        } catch { throw new Error('aiPageInjectionFailed'); }
        let result;
        try { result = await show(); } catch { throw new Error('aiPageRefreshRequired'); }
        if (!result?.ok) throw new Error('aiPageRefreshRequired');
        return {};
      })().then(result => respond({ ok: true, ...result })).catch(error => respond({ ok: false, error: ['invalidTarget', 'aiPageUnavailable', 'aiPageInjectionFailed', 'aiPageRefreshRequired'].includes(error.message) ? error.message : 'aiPageOpenFailed' }));
      return true;
    }
    if (!content || !['AI_PAGE_BEGIN', 'AI_PAGE_BATCH', 'AI_PAGE_CANCEL', 'AI_PAGE_SETTINGS'].includes(message.type)) return false;
    if (message.type === 'AI_PAGE_SETTINGS') { chrome.runtime.openOptionsPage().then(() => respond({ ok: true })).catch(() => respond({ ok: false })); return true; }
    const owner = `${sender.tab.id}:${sender.documentId || sender.frameId}`;
    const storageKey = `pageTranslation:${owner}`;
    if (typeof message.id !== 'string' || message.id.length > 80 || !message.id) return false;
    // Register cancellation synchronously, even while config/storage awaits.
    if (message.type === 'AI_PAGE_BEGIN') cancelOwner(owner);
    if (message.type === 'AI_PAGE_CANCEL') cancelOwner(owner, message.id);
    if (message.type === 'AI_PAGE_BATCH' && (typeof message.requestId !== 'string' || !message.requestId || message.requestId.length > 80)) return false;
    const controller = new AbortController();
    const key = `${owner}:${message.id}:${message.requestId || 'begin'}`;
    if (jobs.has(key)) { respond({ ok: false, error: 'pageInvalidBatch' }); return false; }
    jobs.set(key, { controller, owner, id: message.id });
    serial(async () => {
      await ready;
      if (controller.signal.aborted) throw new Error('pageStopped');
      if (message.type === 'AI_PAGE_CANCEL') {
        const session = (await chrome.storage.session.get(storageKey))[storageKey];
        if (session?.id === message.id) await chrome.storage.session.remove(storageKey);
        return null;
      }
      const pageUrl = new URL(sender.url);
      const pageOrigin = `${pageUrl.protocol}//${pageUrl.hostname}/*`;
      if (!await chrome.permissions.contains({ origins: [pageOrigin] })) throw new Error(t('permissionMissing'));
      if (message.type === 'AI_PAGE_BEGIN') {
        if (!Object.hasOwn(LANGUAGES, message.targetLanguage)) throw new Error('invalidTarget');
        const config = await resolveConfig();
        if (config.models[0] !== message.model || new URL(config.baseUrl).host !== message.provider) throw new Error('pageConfigChanged');
        if (controller.signal.aborted) throw new Error('pageStopped');
        const all = await chrome.storage.session.get(null);
        const obsolete = Object.entries(all).filter(([key, value]) => key.startsWith('pageTranslation:') && (Date.now() - value.created > 3600000 || (key.startsWith(`pageTranslation:${sender.tab.id}:`) && key !== storageKey))).map(([key]) => key);
        if (obsolete.length) await chrome.storage.session.remove(obsolete);
        await chrome.storage.session.set({ [storageKey]: { id: message.id, target: message.targetLanguage, model: config.models[0], baseUrl: config.baseUrl, chars: 0, requests: 0, created: Date.now() } });
        return { begin: true, model: config.models[0] };
      }
      const chars = validatePageBlocks(message.blocks);
      const session = (await chrome.storage.session.get(storageKey))[storageKey];
      if (!session || session.id !== message.id) throw new Error('pageSessionExpired');
      if (Date.now() - session.created > 60 * 60 * 1000) { await chrome.storage.session.remove(storageKey); throw new Error('pageSessionExpired'); }
      if (session.chars + chars > PAGE_LIMITS.pageChars || session.requests >= PAGE_LIMITS.requests) throw new Error('pageBudget');
      if ([...jobs.values()].filter(job => job.owner === owner).length > 2) throw new Error('pageInvalidBatch');
      session.chars += chars; session.requests++;
      await chrome.storage.session.set({ [storageKey]: session });
      return session;
    }).then(async session => {
      if (!session) return {};
      if (session.begin) return { model: session.model };
      if (controller.signal.aborted) throw new Error('pageStopped');
      const translations = await runBatch(message.blocks, session, controller.signal);
      if (controller.signal.aborted) throw new Error('pageStopped');
      return { translations };
    }).then(result => respond({ ok: true, ...result })).catch(error => {
      const known = ['pageInvalidBatch', 'pageInvalidResponse', 'pageBudget', 'pageSessionExpired', 'pageStopped', 'pageConfigChanged'];
      respond({ ok: false, error: known.includes(error.message) ? t(error.message) : error.message, code: known.includes(error.message) ? error.message : error.code });
    }).finally(() => { if (jobs.get(key)?.controller === controller) jobs.delete(key); });
    return true;
  });
  chrome.tabs.onRemoved.addListener(tabId => {
    for (const job of jobs.values()) if (job.owner.startsWith(`${tabId}:`)) job.controller.abort();
    chrome.storage.session.get(null).then(all => chrome.storage.session.remove(Object.keys(all).filter(key => key.startsWith(`pageTranslation:${tabId}:`)))).catch(() => {});
  });
}
