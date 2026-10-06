(() => {
  if (globalThis.__transightSelection) { globalThis.__transightSelection.refresh(); return; }
  let host, shadow, bubble, panel, view, config, selection, captureFrame, bubbleTimer, enabled = false, opening = 0, previousFocus, observer, lifecycle = 0;
  let pinned = false, panelPosition, panelAnchor, drag;
  const requestIds = new Set();
  const send = message => chrome.runtime.sendMessage(message);
  globalThis.__transightSelection = { refresh };
  function own(event) { return host && event.composedPath().includes(host); }
  function editable(node) {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return Boolean(element?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'));
  }
  function cancel() {
    for (const id of requestIds) send({ type: 'SELECTION_CANCEL', id }).catch(() => {});
    requestIds.clear();
  }
  function hideBubble() {
    clearTimeout(bubbleTimer);
    bubbleTimer = null;
    if (bubble) bubble.hidden = true;
  }
  function close(restore = true) {
    stopDrag(); pinned = false; panelPosition = null; panelAnchor = null;
    if (panel) { delete panel.dataset.pinned; panel.scrollTop = 0; panel.style.removeProperty("--panel-max-height"); }
    observer?.disconnect();
    opening++; cancelAnimationFrame(captureFrame); cancel(); view?.dispose(); view = null;
    if (panel) { panel.hidden = true; panel.replaceChildren(); }
    hideBubble();
    if (restore && previousFocus?.isConnected && document.activeElement === host) previousFocus.focus({ preventScroll: true });
  }
  function disable() { lifecycle++; enabled = false; observer?.disconnect(); cancelAnimationFrame(captureFrame); close(); host?.remove(); host = null; shadow = null; }
  async function refresh() {
    const version = ++lifecycle;
    try {
      const result = await send({ type: 'SELECTION_INIT' });
      if (version !== lifecycle) return;
      if (!result?.ok) { disable(); return; }
      config = result; enabled = config.settings.selectionEnabled !== false;
      if (!host) mount();
      view?.setLocale(config.locale); view?.applySettings(config.settings, false); view?.setVault(config.vault);
    } catch { if (version === lifecycle) disable(); }
  }
  function mount() {
    host = document.createElement('div');
    host.dataset.transight = 'selection';
    // A closed shadow root keeps website styles and scripts out of the view.
    host.style.cssText = 'all:initial!important;position:fixed!important;left:0!important;top:0!important;width:0!important;height:0!important;z-index:2147483647!important;';
    shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = config.css + `
      :host{all:initial} [hidden]{display:none!important}
      .selection-bubble{position:fixed;width:28px;height:28px;padding:0;border:0;border-radius:8px;background:#126754;color:white;font:400 14px/1 system-ui;box-shadow:0 3px 12px #18312833;cursor:pointer}
      .selection-bubble{display:grid;place-items:center}
      .selection-bubble svg{display:block;width:18px;height:18px;pointer-events:none}
      .selection-bubble:hover{background:#0a4b3d}
      .selection-panel{position:fixed;width:400px;max-width:calc(100vw - 16px);max-height:min(var(--panel-max-height,calc(100vh - 16px)),calc(100vh - 16px));overflow:auto;overscroll-behavior:contain;border:1px solid #dbe3df;border-radius:16px;box-shadow:0 12px 40px #18312833;background:#f5f6f2;}
      .translation-view{width:100%;min-width:0;min-height:0;text-align:left;direction:ltr;font-weight:400;letter-spacing:normal;}
      .topbar{position:sticky;top:0;z-index:20;background:#f5f6f2;padding:12px 16px;gap:8px}
      .header-actions{gap:0}
      .header-actions .icon-button{width:32px;min-width:32px;min-height:36px}
      .brand{gap:8px}
      .selection-panel[data-pinned="true"] .topbar{cursor:grab;touch-action:none;user-select:none}
      .selection-panel[data-dragging="true"] .topbar{cursor:grabbing}
      #pin-view[aria-pressed="true"]{background:var(--tint);color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
      .topbar .brand>div{min-width:0}.topbar .brand h1{overflow-wrap:anywhere}
      .topbar .brand small{max-width:245px}footer{padding:12px 24px}
      @media(max-width:420px){.topbar{gap:6px;padding:12px}.brand{gap:6px}.brand-icon{width:32px;height:32px}.brand small{display:none}.language-row{gap:6px}.language-row select{width:160px}.header-actions{gap:0}}
    `;
    bubble = document.createElement('button'); bubble.type = 'button'; bubble.className = 'selection-bubble'; bubble.innerHTML = `<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 17A7.5 7.5 0 1 1 17 8"/>
  <path d="M9.5 2C5.5 6 5.5 13 9.5 17M9.5 2C11.8 4.3 13 7 13 10M2 9.5h12"/>
  <path d="M12 13h10m-2.5-2.5L22 13l-2.5 2.5M22 20H12m2.5-2.5L12 20l2.5 2.5"/>
</svg>`; bubble.hidden = true;
    bubble.title = config.locale.messages.selectionTranslate; bubble.setAttribute('aria-label', bubble.title);
    panel = document.createElement('section'); panel.className = 'selection-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', config.locale.messages.panelLabel); panel.hidden = true;
    shadow.append(style, bubble, panel); document.documentElement.append(host);
    bubble.addEventListener('pointerdown', event => event.preventDefault());
    bubble.addEventListener('click', () => open());
    observer = new ResizeObserver(layoutPanel);
    observer.observe(panel);
  }
  function layoutPanel() {
    if (!panel || panel.hidden) return;
    const cards = panel.querySelectorAll('.result-card');
    if (cards.length > 2) {
      // Size to two complete cards, not a hard-coded guess at translation length.
      // scrollTop restores the unscrolled coordinate when the user is browsing.
      const height = Math.ceil(cards[1].getBoundingClientRect().bottom
        - panel.getBoundingClientRect().top + panel.scrollTop + 12);
      const value = `${height}px`;
      if (panel.style.getPropertyValue('--panel-max-height') !== value) panel.style.setProperty('--panel-max-height', value);
    } else panel.style.removeProperty('--panel-max-height');
    positionPanel();
  }
  function contextAnchor(text) {
    const selected = window.getSelection();
    if (selected?.rangeCount && selected.toString().trim() === text.trim()) {
      const rect = selected.getRangeAt(0).getBoundingClientRect();
      if (rect.width && rect.height) return { left: rect.left, top: rect.top, bottom: rect.bottom };
    }
    return { left: Math.max(8, document.documentElement.clientWidth - 408), top: 8, bottom: 8 };
  }
  function place(element, rect, gap = 8) {
    const margin = 8, viewportWidth = document.documentElement.clientWidth, viewportHeight = window.innerHeight;
    const width = element.getBoundingClientRect().width, height = element.getBoundingClientRect().height;
    const left = Math.min(Math.max(margin, rect.left), Math.max(margin, viewportWidth - width - margin));
    let top = rect.bottom + gap;
    if (top + height > viewportHeight - margin && rect.top - height - gap >= margin) top = rect.top - height - gap;
    top = Math.min(Math.max(margin, top), Math.max(margin, viewportHeight - height - margin));
    element.style.left = `${left}px`; element.style.top = `${top}px`;
  }
  function positionPanel() {
    if (!panel || panel.hidden) return;
    if (!panelPosition) { if (panelAnchor) place(panel, panelAnchor); return; }
    const margin = 8;
    const rect = panel.getBoundingClientRect();
    panelPosition.x = Math.min(Math.max(margin, panelPosition.x), Math.max(margin, document.documentElement.clientWidth - rect.width - margin));
    panelPosition.y = Math.min(Math.max(margin, panelPosition.y), Math.max(margin, innerHeight - rect.height - margin));
    panel.style.left = `${panelPosition.x}px`; panel.style.top = `${panelPosition.y}px`;
  }
  function stopDrag(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const previous = drag; drag = null;
    if (panel) delete panel.dataset.dragging;
    if (previous.header.hasPointerCapture(previous.id)) previous.header.releasePointerCapture(previous.id);
  }
  function localizePin(locale) {
    const button = panel?.querySelector('#pin-view'), header = panel?.querySelector('.topbar');
    if (!button || !header) return;
    const key = pinned ? 'unpinTranslation' : 'pinTranslation';
    button.dataset.i18nTitle = key; button.dataset.i18nAriaLabel = key;
    button.title = locale.messages[key]; button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(pinned));
    header.title = pinned ? locale.messages.dragTranslation : '';
    if (pinned) { header.tabIndex = 0; header.setAttribute('aria-label', locale.messages.dragTranslation); }
    else { header.removeAttribute('tabindex'); header.removeAttribute('aria-label'); }
  }
  function installPin() {
    const header = panel.querySelector('.topbar');
    const button = document.createElement('button'); button.id = 'pin-view'; button.type = 'button'; button.className = 'icon-button';
    // Static SVG only; no page or provider content is interpreted as markup.
    button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l-1 7 4 4v2H6v-2l4-4-1-7Z"/><path d="M12 16v5"/></svg>';
    panel.querySelector('#close-view').before(button);
    let locale = config.locale;
    button.addEventListener('click', () => {
      stopDrag(); pinned = !pinned; panel.dataset.pinned = String(pinned);
      if (pinned) {
        const rect = panel.getBoundingClientRect(); panelPosition = { x: rect.left, y: rect.top };
        cancelAnimationFrame(captureFrame); hideBubble();
      }
      localizePin(locale); positionPanel();
    });
    header.addEventListener('pointerdown', event => {
      if (!pinned || event.button !== 0 || !event.isPrimary || event.target.closest('button,a,input,select,textarea,[role="button"]')) return;
      event.preventDefault();
      const rect = panel.getBoundingClientRect();
      drag = { id: event.pointerId, header, startX: event.clientX, startY: event.clientY, x: rect.left, y: rect.top };
      header.setPointerCapture(event.pointerId); panel.dataset.dragging = 'true';
    });
    header.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      event.preventDefault();
      panelPosition = { x: drag.x + event.clientX - drag.startX, y: drag.y + event.clientY - drag.startY }; positionPanel();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) header.addEventListener(type, stopDrag);
    header.addEventListener('keydown', event => {
      if (!pinned || event.target !== header) return;
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!delta) return;
      event.preventDefault(); event.stopPropagation();
      const step = event.shiftKey ? 40 : 10;
      panelPosition.x += delta[0] * step; panelPosition.y += delta[1] * step; positionPanel();
    });
    return next => { locale = next; localizePin(next); };
  }
  function capture(event) {
    if (pinned || !enabled || own(event) || editable(event.target) || editable(document.activeElement)) return;
    cancelAnimationFrame(captureFrame);
    hideBubble();
    // Read the finalized selection on the next paint, without a fixed debounce.
    captureFrame = requestAnimationFrame(() => {
      captureFrame = null;
      if (pinned || !enabled) return;
      const range = window.getSelection();
      if (!range || range.isCollapsed || !range.rangeCount || editable(range.anchorNode) || editable(range.focusNode)) { bubble.hidden = true; return; }
      const text = range.toString();
      if (!text.trim()) { bubble.hidden = true; return; }
      const selectedRange = range.getRangeAt(0);
      const boxes = selectedRange.getClientRects();
      const box = boxes[boxes.length - 1] || selectedRange.getBoundingClientRect();
      if (!box.width || !box.height || box.bottom < 0 || box.top > innerHeight) { bubble.hidden = true; return; }
      selection = { text, rect: { left: box.left, top: box.top, bottom: box.bottom } };
      // Anchor the trigger to the final selected line's end, not its start.
      // Keep the panel anchor unchanged; place() still handles viewport edges.
      bubble.hidden = false; place(bubble, { ...selection.rect, left: box.right }, 3);
      // Each new selection gets its own lifetime; never dismiss the open panel.
      bubbleTimer = setTimeout(hideBubble, 2500);
    });
  }
  async function open(chosen = selection, explicit = false) {
    if (!chosen || (!explicit && (pinned || !enabled))) return false;
    close(false); const version = ++opening;
    previousFocus = document.activeElement;
    // Refresh configuration after worker suspension without exposing credentials.
    let result;
    try { result = await send({ type: 'SELECTION_INIT' }); } catch {
      if (version !== opening) return true;
      disable(); return false;
    }
    if (version !== opening) return true;
    if (!result?.ok) { disable(); return false; }
    config = result; enabled = config.settings.selectionEnabled !== false;
    if (!explicit && !enabled) return false;
    if (!host) mount();
    panel.innerHTML = config.html;
    panel.hidden = false; panelAnchor = chosen.rect;
    const updatePinLocale = installPin();
    view = new TransightTranslationView(panel, {
      selectionMode: true,
      async setTranslationMode(value) {
        const response = await send({ type: 'SELECTION_MODE', value });
        if (!response?.ok) throw new Error();
      },
      vault: config.vault, unlockUrl: chrome.runtime.getURL('src/unlock/unlock.html'),
      async getVaultStatus() {
        const response = await send({ type: 'SELECTION_VAULT_STATUS' });
        if (!response?.ok) throw new Error();
        return response.vault;
      },
      async translate(text, targetLanguage, model, images, sourceLanguage) {
        const id = crypto.randomUUID(); requestIds.add(id);
        try { return await send({ type: 'SELECTION_TRANSLATE', id, text, targetLanguage, model, images, sourceLanguage,
          context: { title: document.title.slice(0, 500), summary: (document.querySelector('meta[name="description"]')?.content || '').slice(0, 1500) } }); }
        finally { requestIds.delete(id); }
      },
      cancel, close,
      async setTargetLanguage(value) {
        const response = await send({ type: 'SELECTION_TARGET_LANGUAGE', value });
        if (!response?.ok) throw new Error();
      },
      settingsUrl: chrome.runtime.getURL('src/options/options.html'),
      openSettings: () => send({ type: 'SELECTION_OPTIONS' }).catch(() => {}),
      async setLanguage(value) { const response = await send({ type: 'SELECTION_LANGUAGE', value }); if (!response?.ok) throw new Error(); return response.locale; },
      localized: updatePinLocale,
      autoTranslateTarget: true
    }, config.locale, config.settings);
    view.input(chosen.text, true);
    observer.observe(panel); observer.observe(panel.querySelector('.translation-view'));
    layoutPanel();
    panel.querySelector('#close-view').focus({ preventScroll: true });
    return true;
  }
  document.addEventListener('pointerup', capture);
  document.addEventListener('keyup', event => { if (event.key !== 'Escape') capture(event); });
  document.addEventListener('pointerdown', event => { if (!own(event) && !pinned) { close(false); } }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !own(event)) close();
  });
  window.addEventListener('pagehide', () => close(false));
  window.addEventListener('blur', () => stopDrag());
  window.addEventListener('scroll', () => { cancelAnimationFrame(captureFrame); hideBubble(); }, true);
  window.addEventListener('resize', () => { cancelAnimationFrame(captureFrame); hideBubble(); positionPanel(); });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (message?.type === 'SELECTION_OPEN' && !sender.tab && typeof message.text === 'string') {
      open({ text: message.text, rect: contextAnchor(message.text) }, true)
        .then(ok => respond({ ok })).catch(() => respond({ ok: false }));
      return true;
    }
    if (message?.type === 'SELECTION_DISABLED') disable();
    if (message?.type === 'SELECTION_LOCALE' && config) {
      config.locale = message.locale; view?.setLocale(message.locale);
      if (bubble) { bubble.title = message.locale.messages.selectionTranslate; bubble.setAttribute('aria-label', bubble.title); }
      panel?.setAttribute('aria-label', message.locale.messages.panelLabel);
    }
    if (message?.type === 'SELECTION_VAULT' && config) { config.vault = message.vault; view?.setVault(message.vault); }
    if (message?.type === 'SELECTION_SETTINGS' && config) {
      const wasEnabled = enabled;
      config.settings = message.settings; enabled = message.settings.selectionEnabled !== false;
      if (wasEnabled && !enabled) close(false);
      view?.applySettings(message.settings);
    }
  });
  refresh();
})();
