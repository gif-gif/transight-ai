import { MAX_TEXT_LENGTH } from './settings.js';
import { showScreenshotPicker } from '../content/screenshot-picker.js';

// Screenshots never enter extension storage. Only the trusted toolbar popup can consume
// a one-use draft, and only the popup can start a capture.
export const SCREENSHOT_PAGE = 'src/screenshot/screenshot.html';
export const SCREENSHOT_POPUP = 'src/popup/popup.html';
export const MAX_IMAGES = 5;
export const MAX_TOTAL_IMAGE_LENGTH = 20 * 1024 * 1024;
export const MAX_IMAGE_LENGTH = 8 * 1024 * 1024;
export function validateImage(image) {
  if (typeof image !== 'string' || image.length > MAX_IMAGE_LENGTH ||
      !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) throw new Error('screenshotInvalid');
  return image;
}
export function validateImages(images) {
  if (!Array.isArray(images)) throw new Error('screenshotInvalid');
  if (images.length > MAX_IMAGES) throw new Error('imageLimit');
  for (const image of images) validateImage(image);
  if (images.reduce((total, image) => total + image.length, 0) > MAX_TOTAL_IMAGE_LENGTH) throw new Error('imageTotalTooLarge');
  return [...images];
}
export function validateCaptureDraft(draft = { text: '', images: [] }) {
  if (!draft || typeof draft.text !== 'string' || draft.text.length > MAX_TEXT_LENGTH) throw new Error('screenshotInvalid');
  return { text: draft.text, images: validateImages(draft.images) };
}
export function cropRect(start, end, width, height) {
  const clamp = (value, max) => Math.max(0, Math.min(max, value));
  const x = Math.floor(clamp(Math.min(start.x, end.x), width));
  const y = Math.floor(clamp(Math.min(start.y, end.y), height));
  return { x, y, width: Math.ceil(clamp(Math.max(start.x, end.x), width)) - x,
    height: Math.ceil(clamp(Math.max(start.y, end.y), height)) - y };
}
export function imageSize(width, height, limit = 2048) {
  const ratio = Math.min(1, limit / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}
export function screenshotAccess(type, sender, runtime) {
  if (sender?.id !== runtime.id || (sender.frameId != null && sender.frameId !== 0)) return false;
  const page = sender.url?.split(/[?#]/)[0];
  return ['SCREENSHOT_CAPTURE', 'SCREENSHOT_TAKE'].includes(type) ? page === runtime.getURL(SCREENSHOT_POPUP) && sender.tab == null :
    ['SCREENSHOT_REGION', 'SCREENSHOT_CANCEL'].includes(type) && /^https?:\/\//.test(page || '') && Number.isInteger(sender.tab?.id);
}
export function createScreenshotDrafts(now = Date.now) {
  const drafts = new Map();
  const sweep = () => { for (const [id, item] of drafts) if (now() - item.created >= 60000) drafts.delete(id); };
  return {
    put(id, tabId, image) {
      sweep();
      while (drafts.size >= 3) drafts.delete(drafts.keys().next().value);
      drafts.set(id, { tabId, image, created: now() });
    },
    take(id, tabId) {
      sweep(); const draft = drafts.get(id);
      if (!draft || draft.tabId !== tabId) throw new Error('screenshotExpired');
      drafts.delete(id); return draft.image;
    },
    takeForTab(tabId) {
      sweep();
      for (const [id, draft] of drafts) if (draft.tabId === tabId) { drafts.delete(id); return draft.image; }
    },
    removeTab(tabId) { for (const [id, item] of drafts) if (item.tabId === tabId) drafts.delete(id); },
    sweep
  };
}
// Coordinates come from the isolated picker, but still validate before allocating a bitmap.
export function validateRegion(rect, viewport) {
  if (!rect || !viewport || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key])) ||
      !['width', 'height', 'x', 'y', 'scale', 'offsetX', 'offsetY'].every(key => Number.isFinite(viewport[key])) ||
      viewport.width <= 0 || viewport.height <= 0 || viewport.width > 32768 || viewport.height > 32768 ||
      viewport.scale !== 1 || viewport.offsetX !== 0 || viewport.offsetY !== 0 ||
      rect.x < 0 || rect.y < 0 || rect.width < 4 || rect.height < 4 ||
      rect.x + rect.width > viewport.width || rect.y + rect.height > viewport.height) throw new Error('screenshotInvalid');
}
export async function cropScreenshot(image, rect, viewport) {
  validateRegion(rect, viewport);
  const bitmap = await createImageBitmap(await (await fetch(validateImage(image))).blob());
  try {
    // Browser pixels have uniform scale. Never stretch Y independently (a
    // viewport override or browser UI can shorten the captured backing surface).
    const sx = bitmap.width / viewport.width, sy = sx;
    if ((rect.y + rect.height) * sy > bitmap.height + 1) throw new Error('screenshotInvalid');
    const pixels = cropRect({ x: rect.x * sx, y: rect.y * sy },
      { x: (rect.x + rect.width) * sx, y: (rect.y + rect.height) * sy }, bitmap.width, bitmap.height);
    const size = imageSize(pixels.width, pixels.height);
    const canvas = new OffscreenCanvas(size.width, size.height);
    canvas.getContext('2d').drawImage(bitmap, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, size.width, size.height);
    const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/jpeg', quality: .92 })).arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return validateImage(`data:image/jpeg;base64,${btoa(binary)}`);
  } finally { bitmap.close(); }
}
export function installScreenshot(ready, t, api = chrome, crop = cropScreenshot) {
  const drafts = createScreenshotDrafts();
  let pending, activeCapture, capturing = false;
  const abort = item => {
    if (!item) return;
    if (pending === item) pending = null;
    api.tabs.sendMessage(item.tab.id, { type: 'SCREENSHOT_ABORT', token: item.token }, { frameId: 0 }).catch(() => {});
  };
  api.tabs.onRemoved.addListener(id => { drafts.removeTab(id); if (pending?.tab.id === id) abort(pending); });
  api.tabs.onActivated.addListener(info => { if (pending?.tab.windowId === info.windowId && pending.tab.id !== info.tabId) abort(pending); });
  api.tabs.onUpdated.addListener((id, info) => { if (info.url || info.status === 'loading') { drafts.removeTab(id); if (pending?.tab.id === id) abort(pending); } });
  api.runtime.onMessage.addListener((message, sender, respond) => {
    if (!screenshotAccess(message?.type, sender, api.runtime)) return false;
    (async () => {
      await ready;
      if (message.type === 'SCREENSHOT_TAKE') {
        const [tab] = await api.tabs.query({ active: true, lastFocusedWindow: true });
        return { draft: tab?.id && !tab.pendingUrl ? drafts.takeForTab(tab.id) : undefined };
      }
      if (message.type === 'SCREENSHOT_CAPTURE') {
        if (capturing) throw new Error('screenshotFailed');
        const [tab] = await api.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab?.id || !/^https?:\/\//.test(tab.url || '') || tab.pendingUrl) throw new Error('screenshotUnsupported');
        const draft = validateCaptureDraft(message.draft);
        if (draft.images.length >= MAX_IMAGES) throw new Error('imageLimit');
        abort(pending);
        const item = { draft, token: crypto.randomUUID(), tab, created: Date.now() }; pending = item;
        try {
          const result = await api.scripting.executeScript({ target: { tabId: tab.id }, func: showScreenshotPicker,
            args: [item.token, { hint: t('screenshotPickerHint'), cancel: t('screenshotPickerCancel'), confirm: t('screenshotPickerConfirm'), failed: t('screenshotFailed'), ready: t('screenshotReady') }] });
          if (pending !== item || !result[0] || result[0].error) throw new Error('screenshotFailed');
          item.documentId = result[0].documentId;
          // Preserve the current input across the popup closing, including cancel.
          drafts.removeTab(tab.id);
          if (draft.text || draft.images.length) {
            drafts.put(item.token, tab.id, draft); setTimeout(() => drafts.sweep(), 60000);
          }
          setTimeout(() => { if (pending === item) abort(item); }, 120000);
          return {};
        } catch (error) { abort(item); throw error; }
      }
      const item = message.type === 'SCREENSHOT_CANCEL' ? pending || activeCapture : pending;
      if (!item || item.token !== message.token || item.tab.id !== sender.tab.id || item.tab.url !== sender.url ||
          (item.documentId && item.documentId !== sender.documentId) || Date.now() - item.created >= 120000) throw new Error('screenshotExpired');
      if (message.type === 'SCREENSHOT_CANCEL') { item.cancelled = true; abort(item); return {}; }
      if (capturing) throw new Error('screenshotFailed');
      pending = null; capturing = true; activeCapture = item;
      const tab = item.tab;
      let changed = false;
      const activated = info => { if (info.windowId === tab.windowId && info.tabId !== tab.id) changed = true; };
      const updated = (id, info) => { if (id === tab.id && (info.url || info.status === 'loading')) changed = true; };
      api.tabs.onActivated.addListener(activated); api.tabs.onUpdated.addListener(updated);
      try {
        validateRegion(message.rect, message.viewport);
        async function checkPage() {
          const [active] = await api.tabs.query({ active: true, windowId: tab.windowId });
          if (item.cancelled || changed || active?.id !== tab.id || active.url !== tab.url || active.pendingUrl) throw new Error('screenshotFailed');
          const [state] = await api.scripting.executeScript({ target: { tabId: tab.id }, func: () => ({ width: innerWidth, height: innerHeight,
            x: scrollX, y: scrollY, scale: visualViewport?.scale || 1, offsetX: visualViewport?.offsetLeft || 0, offsetY: visualViewport?.offsetTop || 0 }) });
          if (!state || (item.documentId && state.documentId !== item.documentId) ||
              Object.keys(message.viewport).some(key => state.result?.[key] !== message.viewport[key])) throw new Error('screenshotFailed');
        }
        await checkPage();
        // Chrome captures the visible viewport internally; discard it after cropping.
        // Neither the webpage nor the popup ever receives the full-viewport bitmap.
        let captured = await api.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 95 });
        await checkPage();
        const image = await crop(captured, message.rect, message.viewport); captured = null;
        await checkPage();
        // Return to the existing toolbar popup; never navigate or open a tab.
        const next = { text: item.draft.text, images: validateImages([...item.draft.images, image]) };
        drafts.removeTab(tab.id);
        const id = crypto.randomUUID(); drafts.put(id, tab.id, next);
        setTimeout(() => drafts.sweep(), 60000);
        let opened = false;
        try { await api.action.openPopup({ windowId: tab.windowId }); opened = true; }
        catch { /* Older Chrome or focus restrictions: reopen the toolbar manually. */ }
        return { opened };
      } finally {
        capturing = false; activeCapture = null;
        api.tabs.onActivated.removeListener(activated); api.tabs.onUpdated.removeListener(updated);
      }
    })().then(result => respond({ ok: true, ...result })).catch(error => {
      const key = ['screenshotExpired', 'screenshotUnsupported', 'screenshotInvalid', 'imageLimit', 'imageTotalTooLarge'].includes(error.message) ? error.message : 'screenshotFailed';
      respond({ ok: false, error: t(key) });
    });
    return true;
  });
}
