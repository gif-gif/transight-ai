// Serialized into the isolated world by scripting.executeScript. Keep self-contained.
export function showScreenshotPicker(token, labels) {
  globalThis.__transightScreenshotPicker?.cancel();
  const viewport = () => ({ width: innerWidth, height: innerHeight, x: scrollX, y: scrollY,
    scale: visualViewport?.scale || 1, offsetX: visualViewport?.offsetLeft || 0, offsetY: visualViewport?.offsetTop || 0 });
  const initial = viewport();
  if (initial.scale !== 1 || initial.offsetX || initial.offsetY) throw new Error('screenshotUnsupported');
  const host = document.createElement('div');
  host.dataset.transightScreenshot = '';
  host.setAttribute('popover', 'manual');
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;margin:0!important;padding:0!important;border:0!important;max-width:none!important;max-height:none!important;overflow:hidden!important;background:transparent!important;z-index:2147483647!important;';
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `<style>
    :host::backdrop{background:transparent} *{box-sizing:border-box}
    .surface{position:absolute;inset:0;cursor:crosshair;touch-action:none;user-select:none;font:14px/1.5 system-ui,sans-serif;color:#fff;outline:none;background:rgb(12 18 28 / .38)}
    .region{position:absolute;border:2px solid #ffb65c;box-shadow:0 0 0 99999px rgb(12 18 28 / .38);pointer-events:none}
    .hint,.actions{position:absolute;padding:10px 14px;border-radius:10px;background:#202631;box-shadow:0 4px 18px #0004;max-width:calc(100vw - 24px)}
    .hint{top:16px;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none}
    .actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;right:16px;bottom:16px;cursor:default}
    button{font:inherit;color:#fff;background:#394252;border:0;border-radius:6px;padding:7px 12px;cursor:pointer}
    button.confirm{background:#ffb65c;color:#21180d} button:disabled{opacity:.45;cursor:default} button:focus-visible{outline:2px solid #fff;outline-offset:3px}
    [hidden]{display:none!important}
  </style><div class="surface" tabindex="-1" role="dialog" aria-modal="true"><div class="region" hidden></div><div class="hint" role="status"></div><div class="actions"><span class="size"></span><button class="cancel"></button><button class="confirm" disabled></button></div></div>`;
  const surface = shadow.querySelector('.surface'), region = shadow.querySelector('.region');
  const hint = shadow.querySelector('.hint'), size = shadow.querySelector('.size');
  const confirm = shadow.querySelector('.confirm'), cancelButton = shadow.querySelector('.cancel');
  surface.setAttribute('aria-label', labels.hint); hint.textContent = labels.hint;
  cancelButton.textContent = labels.cancel; confirm.textContent = labels.confirm;
  const previousFocus = document.activeElement;
  let start, rect, pointer, preservedRect, dragged, submitting = false, disposed = false, timer;
  const controller = new AbortController(), signal = controller.signal;
  function cleanup() {
    if (disposed) return;
    disposed = true; clearTimeout(timer); controller.abort();
    chrome.runtime.onMessage.removeListener(onMessage); host.remove();
    if (globalThis.__transightScreenshotPicker?.token === token) delete globalThis.__transightScreenshotPicker;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function cancel() {
    cleanup(); chrome.runtime.sendMessage({ type: 'SCREENSHOT_CANCEL', token }).catch(() => {});
  }
  function onMessage(message, sender) {
    if (sender.id === chrome.runtime.id && message.type === 'SCREENSHOT_ABORT' && message.token === token) cleanup();
  }
  globalThis.__transightScreenshotPicker = { token, cancel };
  chrome.runtime.onMessage.addListener(onMessage);
  function changed() {
    if (JSON.stringify(initial) !== JSON.stringify(viewport())) cancel();
  }
  function stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }
  const point = event => ({ x: Math.max(0, Math.min(innerWidth, event.clientX)), y: Math.max(0, Math.min(innerHeight, event.clientY)) });
  function draw(event) {
    const end = point(event);
    rect = { x: Math.floor(Math.min(start.x, end.x)), y: Math.floor(Math.min(start.y, end.y)),
      width: Math.ceil(Math.max(start.x, end.x)) - Math.floor(Math.min(start.x, end.x)),
      height: Math.ceil(Math.max(start.y, end.y)) - Math.floor(Math.min(start.y, end.y)) };
    region.hidden = false; surface.style.background = 'transparent';
    Object.assign(region.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    size.textContent = `${rect.width} × ${rect.height}`;
    confirm.disabled = rect.width < 4 || rect.height < 4;
  }
  surface.addEventListener('pointerdown', event => {
    if (submitting || event.button !== 0 || pointer != null || event.target.closest('.actions')) return;
    stop(event); pointer = event.pointerId; start = point(event); dragged = false;
    preservedRect = rect && start.x >= rect.x && start.x <= rect.x + rect.width && start.y >= rect.y && start.y <= rect.y + rect.height ? rect : null;
    surface.setPointerCapture(pointer);
    if (!preservedRect) draw(event);
  }, { signal });
  surface.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    stop(event);
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 4) dragged = true;
    if (dragged) draw(event);
  }, { signal });
  surface.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return;
    stop(event); if (dragged || !preservedRect) draw(event); surface.releasePointerCapture(pointer); pointer = null;
  }, { signal });
  surface.addEventListener('pointercancel', () => { pointer = null; rect = null; confirm.disabled = true; region.hidden = true; surface.style.background = ''; }, { signal });
  surface.addEventListener('dblclick', event => {
    if (event.target.closest('.actions') || !rect || dragged || submitting) return;
    const p = point(event);
    if (p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height) { stop(event); submit(); }
  }, { signal });
  async function submit() {
    if (submitting || pointer != null || !rect || confirm.disabled) return;
    changed(); if (disposed) return;
    submitting = true; confirm.disabled = true;
    // Keep intercepting input, but remove all overlay pixels before capture.
    surface.style.opacity = '0';
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (disposed) return;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SCREENSHOT_REGION', token, rect, viewport: initial });
      if (!response?.ok) throw new Error(response?.error || labels.failed);
      if (response.opened === false) {
        surface.style.opacity = '1'; surface.style.background = 'transparent'; region.hidden = true;
        hint.textContent = labels.ready; shadow.querySelector('.actions').hidden = true;
        // Non-blocking notice for browsers that cannot reopen the popup.
        host.style.setProperty('pointer-events', 'none', 'important');
        surface.removeAttribute('aria-modal'); surface.removeAttribute('tabindex');
        controller.abort(); clearTimeout(timer); timer = setTimeout(cleanup, 8000);
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        // The image remains in a short-lived background draft, never in this page.
      } else cleanup();
    } catch (error) {
      if (disposed) return;
      submitting = false; surface.style.opacity = '1'; hint.textContent = error.message || labels.failed;
      // This handoff is single use. Cancel/reopen instead of capturing stale coordinates.
      confirm.hidden = true;
    }
  }
  confirm.addEventListener('click', submit, { signal }); cancelButton.addEventListener('click', cancel, { signal });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') { stop(event); cancel(); }
    else if (event.key === 'Enter' && shadow.activeElement?.tagName !== 'BUTTON') { stop(event); submit(); }
    else if ([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key) && shadow.activeElement?.tagName !== 'BUTTON') stop(event);
    else if (event.key === 'Tab') { stop(event); (shadow.activeElement === cancelButton && !confirm.disabled && !confirm.hidden ? confirm : cancelButton).focus(); }
  }, { capture: true, signal });
  surface.addEventListener('wheel', stop, { passive: false, signal });
  surface.addEventListener('touchmove', stop, { passive: false, signal });
  surface.addEventListener('contextmenu', stop, { signal });
  window.addEventListener('resize', cancel, { signal });
  window.addEventListener('scroll', changed, { capture: true, signal });
  visualViewport?.addEventListener('resize', cancel, { signal });
  visualViewport?.addEventListener('scroll', changed, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); }, { signal });
  window.addEventListener('pagehide', cancel, { signal });
  document.documentElement.append(host); host.showPopover(); surface.focus({ preventScroll: true });
  timer = setTimeout(cancel, 120000);
}
