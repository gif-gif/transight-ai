(() => {
  if (globalThis.__transightPageTranslation) return;
  const send = async message => chrome.runtime.sendMessage(message);
  const engine = new TransightPageEngine();
  let host, root, config, job, observer, timer, routeTimer, original = false, collapsed = false, mode = 'confirm', error = '', epoch = 0;
  const t = (key, values = []) => (config?.locale.messages[key] || key).replace(/\$([1-9])/g, (_, i) => String(values[Number(i) - 1] ?? ''));
  const el = id => root.getElementById(id);
  function button(id, label, action) {
    const element = document.createElement('button'); element.id = id; element.type = 'button'; element.textContent = label;
    element.addEventListener('click', action); return element;
  }
  function mount() {
    if (host?.isConnected) return;
    host = document.createElement('div'); host.dataset.transight = 'page';
    host.style.cssText = 'all:initial!important;position:fixed!important;right:16px!important;top:16px!important;z-index:2147483647!important;display:block!important;color-scheme:light!important';
    root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = ':host{all:initial}*{box-sizing:border-box}[hidden]{display:none!important}.bar{width:350px;max-width:calc(100vw - 32px);padding:14px;background:#fffdf8;color:#263c36;border:1px solid #d6ded8;border-radius:14px;box-shadow:0 6px 30px #142b2926;font:13px/1.5 system-ui,sans-serif}header{display:flex;align-items:center;gap:8px}strong{flex:1;font-size:14px}button{font:inherit;cursor:pointer;padding:6px 10px;border:1px solid #d6ded8;border-radius:7px;background:transparent;color:inherit}button:hover{background:#edf3ee}button:focus{outline:none}button:focus-visible{filter:brightness(.94)}#start,#continue{background:#285c50;color:white;border-color:#285c50}header button{padding:2px 8px}p{margin:9px 0;overflow-wrap:anywhere}#meta{color:#64736d;font-size:12px}#actions{display:flex;flex-wrap:wrap;gap:6px}#error{color:#a02f31}iframe{border:0;width:100%;height:160px}.compact{width:auto;min-width:190px}';
    const bar = document.createElement('section'); bar.className = 'bar'; bar.id = 'bar'; bar.setAttribute('aria-label', t('aiPageTranslate'));
    const header = document.createElement('header'), title = document.createElement('strong'); title.textContent = t('aiPageTranslate');
    const fold = button('fold', '−', () => { collapsed = !collapsed; render(); });
    header.append(title, fold, button('close', '×', () => { stop(); engine.restore(); original = false; mode = 'confirm'; error = ''; host.remove(); }));
    bar.append(header);
    for (const id of ['meta', 'consent', 'progress', 'error']) { const p = document.createElement('p'); p.id = id; if (id === 'progress' || id === 'error') p.setAttribute('role', 'status'); bar.append(p); }
    const actions = document.createElement('div'); actions.id = 'actions';
    actions.append(button('start', t('pageStart'), () => begin()), button('stop', t('pageStop'), () => { stop(); mode = 'stopped'; render(); }), button('toggle', t('pageOriginal'), () => { original = !original; engine.toggle(original); render(); if (job) pump(job); }), button('restore', t('pageRestore'), () => { stop(); engine.restore(); original = false; mode = 'confirm'; render(); }), button('continue', t('pageContinue'), () => begin(true)), button('settings', t('settings'), () => send({ type: 'AI_PAGE_SETTINGS', id: TransightRequestId() }).catch(() => {})));
    bar.append(actions);
    const unlock = document.createElement('iframe'); unlock.id = 'unlock'; unlock.hidden = true; unlock.title = t('vaultUnlock');
    bar.append(unlock); root.append(style, bar); document.documentElement.append(host);
  }
  function render() {
    if (!root) return;
    const stats = engine.stats();
    root.querySelector('strong').textContent = t('aiPageTranslate');
    el('bar').setAttribute('aria-label', t('aiPageTranslate'));
    for (const [id, key] of Object.entries({ stop: 'pageStop', restore: 'pageRestore', continue: 'pageContinue', settings: 'settings' })) el(id).textContent = t(key);
    el('bar').classList.toggle('compact', collapsed);
    el('fold').textContent = collapsed ? '+' : '−'; el('fold').title = t(collapsed ? 'pageExpand' : 'pageCollapse');
    el('fold').setAttribute('aria-label', el('fold').title); el('fold').setAttribute('aria-expanded', String(!collapsed));
    el('close').title = t('pageClose'); el('close').setAttribute('aria-label', t('pageClose'));
    el('meta').textContent = `${config.model || '—'} · ${config.targetLanguage} · ${config.provider}`;
    el('consent').textContent = t('pageConsent');
    el('progress').textContent = mode === 'confirm' ? t('pageReady') : `${t(['running', 'starting'].includes(mode) ? 'pageWorking' : mode === 'watching' ? 'pageWatching' : mode === 'budget' ? 'pageBudget' : 'pageStopped')} · ${t('pageProgress', [stats.done, stats.total, stats.failed])}`;
    el('error').textContent = error;
    for (const id of ['meta', 'consent', 'progress', 'error', 'actions']) el(id).hidden = collapsed;
    el('consent').hidden = collapsed || !['confirm', 'budget'].includes(mode);
    el('error').hidden = collapsed || !error;
    el('start').hidden = mode === 'budget' || (!['confirm', 'stopped', 'starting'].includes(mode) && !stats.failed);
    el('start').textContent = t(stats.failed ? 'pageRetry' : 'pageStart');
    el('start').disabled = mode === 'starting';
    el('stop').hidden = !job;
    el('toggle').hidden = !stats.done; el('toggle').textContent = t(original ? 'pageTranslated' : 'pageOriginal');
    el('restore').hidden = !stats.total;
    el('continue').hidden = mode !== 'budget';
    el('unlock').hidden = collapsed || el('unlock').dataset.show !== 'true';
  }
  function stop() {
    epoch++; clearTimeout(timer); clearInterval(routeTimer); observer?.disconnect();
    if (job) { const old = job; job = null; send({ type: 'AI_PAGE_CANCEL', id: old.id }).catch(() => {}); }
    engine.retry();
  }
  function samePage(active) {
    if (job !== active) return false;
    if (location.href !== active.url) { stop(); mode = 'stopped'; error = t('pageNavigated'); render(); return false; }
    return true;
  }
  async function begin(continuation = false) {
    stop(); const generation = epoch;
    error = ''; el('unlock').dataset.show = 'false'; mode = 'starting'; render();
    const active = { id: TransightRequestId(), url: location.href, running: 0, chars: 0, calls: 0 };
    job = active; render();
    try {
      const response = await send({ type: 'AI_PAGE_BEGIN', id: active.id, targetLanguage: config.targetLanguage, model: config.model, provider: config.provider });
      if (generation !== epoch || !samePage(active)) return;
      if (!response?.ok) { const reason = new Error(response?.error || t('pageSessionExpired')); reason.code = response?.code; throw reason; }
      config.model = response.model;
      if (!continuation) engine.retry();
      mode = 'running'; render();
      observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(() => pump(active), 450); });
      observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'style', 'translate', 'contenteditable', 'aria-hidden'] });
      routeTimer = setInterval(() => samePage(active), 700);
      pump(active);
    } catch (reason) {
      if (generation !== epoch) return;
      stop(); mode = 'stopped'; error = reason.message;
      // Trusted extension iframe reuses the existing vault unlock UI. It never
      // exposes the password/key to this content script; Start can be retried.
      if (reason.code === 'PAGE_LOCKED') { el('unlock').src = chrome.runtime.getURL('src/unlock/unlock.html'); el('unlock').dataset.show = 'true'; }
      render();
    }
  }
  function pump(active) {
    if (!samePage(active) || original) return;
    while (active.running < 2) {
      const blocks = engine.batch();
      if (!blocks.length) { mode = active.running ? 'running' : 'watching'; render(); return; }
      const chars = blocks.reduce((n, block) => n + block.chars, 0);
      if (active.chars + chars > 60000 || active.calls >= 100) {
        engine.fail(blocks); stop(); mode = 'budget'; render(); return;
      }
      active.chars += chars; active.calls++; active.running++; mode = 'running'; render();
      send({ type: 'AI_PAGE_BATCH', id: active.id, requestId: TransightRequestId(), blocks: engine.wire(blocks) }).then(response => {
        if (!samePage(active)) return;
        if (!response?.ok) {
          engine.fail(blocks); error = response?.error || t('pageSessionExpired');
          // Invalid structured output fails just this batch; auth/network errors
          // pause instead of repeatedly spending or sending more page text.
          if (response?.code !== 'pageInvalidResponse') { stop(); mode = response?.code === 'pageBudget' ? 'budget' : 'stopped'; }
        } else engine.apply(blocks, response.translations);
      }).catch(() => {
        if (!samePage(active)) return;
        engine.fail(blocks); stop(); mode = 'stopped'; error = t('pageSessionExpired');
      }).finally(() => { active.running--; if (job === active) pump(active); render(); });
    }
  }
  const onMessage = (message, sender, respond) => {
    if (message?.type === 'SELECTION_LOCALE' && config && sender.id === chrome.runtime.id && !sender.tab) { config.locale = message.locale; render(); return false; }
    if (message?.type !== 'AI_PAGE_SHOW' || sender.id !== chrome.runtime.id || sender.tab) return false;
    if (config && (config.targetLanguage !== message.targetLanguage || config.model !== message.model || config.provider !== message.provider)) { stop(); engine.restore(); original = false; mode = 'confirm'; }
    config = message; collapsed = false; mount(); render(); respond({ ok: true }); return false;
  };
  chrome.runtime.onMessage.addListener(onMessage);
  const onPageHide = () => { stop(); engine.restore(); mode = 'confirm'; original = false; };
  window.addEventListener('pagehide', onPageHide);
  globalThis.__transightPageTranslation = { dispose() {
    onPageHide(); host?.remove();
    try { chrome.runtime.onMessage.removeListener(onMessage); } catch { /* Old extension context may already be invalidated. */ }
    window.removeEventListener('pagehide', onPageHide);
  } };
})();
