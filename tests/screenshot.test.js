import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_IMAGE_LENGTH, MAX_IMAGES, MAX_TOTAL_IMAGE_LENGTH, validateImages, validateCaptureDraft, SCREENSHOT_PAGE, validateImage, cropRect, imageSize, screenshotAccess, createScreenshotDrafts, installScreenshot, validateRegion, cropScreenshot } from '../src/shared/screenshot.js';
import { credentialAccess } from '../src/shared/credential-access.js';
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=';
const runtime = { id: 'test', getURL: path => `chrome-extension://test/${path}` };
const popup = { id: 'test', url: runtime.getURL('src/popup/popup.html'), frameId: 0 };
const editor = { id: 'test', url: runtime.getURL(`${SCREENSHOT_PAGE}?capture=1`), frameId: 0, tab: { id: 2 } };
test('image input accepts bounded inline PNG/JPEG only, never remote URLs or SVG', () => {
  assert.equal(validateImage(image), image);
  for (const bad of [undefined, null, '', 'https://host/image.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,<img>', 'data:image/jpeg;base64,' + 'a'.repeat(MAX_IMAGE_LENGTH)]) assert.throws(() => validateImage(bad));
});
test('crop coordinates clamp, reverse direction and preserve high-DPI pixels; resize never upscales', () => {
  assert.deepEqual(cropRect({ x: 99.4, y: 150 }, { x: -10, y: 30.2 }, 100, 100), { x: 0, y: 30, width: 100, height: 70 });
  assert.deepEqual(cropRect({ x: 10, y: 20 }, { x: 10, y: 20 }, 100, 100), { x: 10, y: 20, width: 0, height: 0 });
  assert.deepEqual(imageSize(4096, 2048), { width: 2048, height: 1024 });
  assert.deepEqual(imageSize(40, 20), { width: 40, height: 20 });
});
test('capture authority is isolated from webpages, embedded frames and other extensions', () => {
  assert.equal(screenshotAccess('SCREENSHOT_CAPTURE', popup, runtime), true);
  assert.equal(screenshotAccess('SCREENSHOT_TAKE', editor, runtime), false);
  for (const sender of [{ ...popup, id: 'other' }, { ...popup, url: 'https://page/' }, { ...popup, frameId: 1 }, editor, {}]) assert.equal(screenshotAccess('SCREENSHOT_CAPTURE', sender, runtime), false);
  assert.equal(screenshotAccess('SCREENSHOT_TAKE', popup, runtime), true);
  assert.equal(credentialAccess({ type: 'VAULT_STATUS' }, editor, runtime), true);
  for (const type of ['VAULT_UNLOCK', 'VAULT_SAVE', 'VAULT_RESET', 'VAULT_LOCK', 'FETCH_MODELS']) assert.equal(credentialAccess({ type }, editor, runtime), false);
});
test('drafts are bounded, one-use, tab-bound, expiring and cleaned on close', () => {
  let now = 0; const drafts = createScreenshotDrafts(() => now);
  drafts.put('a', 1, image);
  assert.throws(() => drafts.take('a', 2));
  assert.equal(drafts.take('a', 1), image); assert.throws(() => drafts.take('a', 1));
  drafts.put('b', 2, image); now = 60000; assert.throws(() => drafts.take('b', 2));
  for (let i = 0; i < 4; i++) drafts.put(String(i), i, image);
  assert.throws(() => drafts.take('0', 0));
  drafts.removeTab(1); assert.throws(() => drafts.take('1', 1));
  assert.equal(drafts.take('3', 3), image);
});
function event() { const listeners = new Set(); return { addListener: f => listeners.add(f), removeListener: f => listeners.delete(f), emit: (...args) => { for (const f of listeners) f(...args); } }; }
const viewport = { width: 1200, height: 800, x: 0, y: 200, scale: 1, offsetX: 0, offsetY: 0 };
const rect = { x: 40, y: 80, width: 300, height: 200 };
const source = { id: 'test', url: 'https://example.test/', tab: { id: 1 }, frameId: 0, documentId: 'doc1' };
function harness({ url = source.url, navigate = false, switchTab = false, resize = false, failInjection = false, failOpen = false, onCapture } = {}) {
  let handler, captures = 0, token; const created = [], updates = [], aborted = [], crops = [], opened = [];
  const tabs = { onRemoved: event(), onActivated: event(), onUpdated: event(),
    query: async () => [{ id: 1, windowId: 9, url }],
    captureVisibleTab: async (windowId, options) => {
      captures++;
      assert.equal(windowId, 9); assert.equal(options.format, 'jpeg');
      await onCapture?.();
      if (navigate) tabs.onUpdated.emit(1, { status: 'loading' });
      if (switchTab) tabs.onActivated.emit({ windowId: 9, tabId: 20 });
      return image;
    },
    sendMessage: async (id, message) => aborted.push({ id, message }),
    create: async options => { created.push(options); return { id: 2 }; },
    update: async (id, options) => { updates.push({ id, ...options }); }, remove: async () => {}
  };
  const scripting = { executeScript: async options => {
    if (options.args) { if (failInjection) throw new Error('denied'); token = options.args[0]; return [{ documentId: 'doc1' }]; }
    return [{ documentId: 'doc1', result: { ...viewport, ...(resize ? { width: 900 } : {}) } }];
  } };
  installScreenshot(Promise.resolve(), key => key, { runtime: { ...runtime, onMessage: { addListener: fn => { handler = fn; } } }, tabs, scripting, action: { openPopup: async options => { opened.push(options); if (failOpen) throw new Error('unsupported'); } } }, async (...args) => { crops.push(args); return image; });
  const call = (message, sender = popup) => new Promise(resolve => { if (!handler(message, sender, resolve)) resolve(null); });
  return { created, updates, opened, tabs, aborted, crops, call, get captures() { return captures; }, get token() { return token; },
    region: (changes = {}, sender = source) => call({ type: 'SCREENSHOT_REGION', token, rect, viewport, ...changes }, sender) };
}
test('picker opens without capturing; only confirmed region opens a tab-bound one-use draft', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  const h = harness();
  assert.deepEqual(await h.call({ type: 'SCREENSHOT_CAPTURE' }), { ok: true });
  assert.equal(h.created.length, 0); assert.equal(h.captures, 0);
  assert.deepEqual(await h.region(), { ok: true, opened: true });
  assert.equal(h.captures, 1); assert.deepEqual(h.crops[0], [image, rect, viewport]);
  assert.equal((await h.region()).ok, false);
  assert.equal(h.created.length, 0); assert.equal(h.updates.length, 0);
  assert.deepEqual(h.opened, [{ windowId: 9 }]);
  assert.equal(await h.call({ type: 'SCREENSHOT_TAKE' }, editor), null);
  assert.equal(await h.call({ type: 'SCREENSHOT_TAKE' }, { ...popup, tab: { id: 2 } }), null);
  assert.deepEqual(await h.call({ type: 'SCREENSHOT_TAKE' }), { ok: true, draft: { text: '', images: [image] } });
  assert.deepEqual(await h.call({ type: 'SCREENSHOT_TAKE' }), { ok: true, draft: undefined });
});
test('restricted pages, injection failure and mid-capture changes never produce drafts', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  for (const options of [{ url: 'chrome://extensions/' }, { url: 'file:///private' }, { failInjection: true }, { navigate: true }, { switchTab: true }, { resize: true }]) {
    const h = harness(options);
    const start = await h.call({ type: 'SCREENSHOT_CAPTURE' });
    if (start.ok) assert.equal((await h.region()).ok, false);
    assert.equal(h.created.length, 0);
  }
});
test('region requires matching nonce, top-level tab, document and URL; cancellation invalidates it', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  const h = harness(); await h.call({ type: 'SCREENSHOT_CAPTURE' });
  for (const sender of [{ ...source, frameId: 1 }, { ...source, tab: { id: 9 } }, { ...source, documentId: 'old' }, { ...source, url: 'https://other.test/' }, { ...source, id: 'other' }, popup]) {
    assert.ok(!(await h.region({}, sender))?.ok);
  }
  assert.equal((await h.region({ token: 'forged' })).ok, false);
  assert.equal(h.captures, 0);
  assert.equal((await h.call({ type: 'SCREENSHOT_CANCEL', token: h.token }, source)).ok, true);
  assert.equal((await h.region()).ok, false); assert.equal(h.captures, 0);
  await h.call({ type: 'SCREENSHOT_CAPTURE' });
  h.tabs.onActivated.emit({ tabId: 3, windowId: 9 });
  assert.equal((await h.region()).ok, false); assert.equal(h.captures, 0);
});
test('region validation rejects empty, non-finite, out-of-bounds and pinch-zoomed crops', () => {
  validateRegion(rect, viewport);
  for (const patch of [{ width: 0 }, { x: -1 }, { y: NaN }, { height: Infinity }, { width: 1201 }]) assert.throws(() => validateRegion({ ...rect, ...patch }, viewport));
  for (const patch of [{ scale: 2 }, { offsetX: 20 }, { width: 0 }, { height: Infinity }]) assert.throws(() => validateRegion(rect, { ...viewport, ...patch }));
});
test('background crop uses actual bitmap scale, passes only selected pixels and closes bitmap', async t => {
  let drawn, closed = false;
  t.mock.method(globalThis, 'fetch', async () => ({ blob: async () => ({}) }));
  const oldBitmap = globalThis.createImageBitmap, oldCanvas = globalThis.OffscreenCanvas;
  globalThis.createImageBitmap = async () => ({ width: 2400, height: 1600, close: () => { closed = true; } });
  globalThis.OffscreenCanvas = class {
    constructor(w, h) { assert.equal(w, 600); assert.equal(h, 400); }
    getContext() { return { drawImage: (...args) => { drawn = args.slice(1); } }; }
    async convertToBlob() { return new Blob(['pixels']); }
  };
  try {
    assert.equal(await cropScreenshot(image, rect, viewport), 'data:image/jpeg;base64,cGl4ZWxz');
    assert.deepEqual(drawn, [80, 160, 600, 400, 0, 0, 600, 400]); assert.equal(closed, true);
  } finally {
    if (oldBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = oldBitmap;
    if (oldCanvas === undefined) delete globalThis.OffscreenCanvas; else globalThis.OffscreenCanvas = oldCanvas;
  }
});

test('cancelling during capture discards its image and never opens an editor', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  const h = harness({ onCapture: async () => {
    assert.equal((await h.call({ type: 'SCREENSHOT_CANCEL', token: h.token }, source)).ok, true);
  } });
  await h.call({ type: 'SCREENSHOT_CAPTURE' });
  assert.equal((await h.region()).ok, false);
  assert.equal(h.created.length, 0); assert.equal(h.crops.length, 0);
});
test('region handoff expires and invalid rectangles never call capture', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  const h = harness();
  await h.call({ type: 'SCREENSHOT_CAPTURE' });
  assert.equal((await h.region({ rect: { ...rect, width: 1 } })).ok, false);
  assert.equal(h.captures, 0);
  await h.call({ type: 'SCREENSHOT_CAPTURE' });
  const now = Date.now(); t.mock.method(Date, 'now', () => now + 120001);
  assert.equal((await h.region()).error, 'screenshotExpired'); assert.equal(h.captures, 0);
});

test('popup unavailable retains a one-use draft without opening a page; navigation drops it', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  const h = harness({ failOpen: true });
  await h.call({ type: 'SCREENSHOT_CAPTURE' });
  assert.deepEqual(await h.region(), { ok: true, opened: false });
  assert.equal(h.created.length, 0);
  assert.deepEqual(await h.call({ type: 'SCREENSHOT_TAKE' }), { ok: true, draft: { text: '', images: [image] } });
  await h.call({ type: 'SCREENSHOT_CAPTURE' }); await h.region();
  h.tabs.onUpdated.emit(1, { status: 'loading' });
  assert.equal((await h.call({ type: 'SCREENSHOT_TAKE' })).draft, undefined);
});
test('toolbar drafts stay isolated by active tab, expire, and can only be consumed once', () => {
  let now = 0; const drafts = createScreenshotDrafts(() => now);
  drafts.put('a', 1, image); drafts.put('b', 2, 'second');
  assert.equal(drafts.takeForTab(3), undefined);
  assert.equal(drafts.takeForTab(1), image);
  assert.equal(drafts.takeForTab(1), undefined);
  now = 60000; assert.equal(drafts.takeForTab(2), undefined);
});

test('image arrays enforce count, total size and inline-only formats; drafts bound text', () => {
  assert.deepEqual(validateImages([]), []); assert.deepEqual(validateImages([image, image]), [image, image]);
  for (const value of [null, {}, 'bad', [undefined], ['https://host/a.png']]) assert.throws(() => validateImages(value));
  assert.throws(() => validateImages(Array(MAX_IMAGES + 1).fill(image)), /imageLimit/);
  const large = 'data:image/jpeg;base64,' + 'a'.repeat(Math.floor(MAX_TOTAL_IMAGE_LENGTH / 3));
  assert.throws(() => validateImages([large, large, large]), /imageTotalTooLarge/);
  assert.deepEqual(validateCaptureDraft(), { text: '', images: [] });
  for (const value of [null, { text: 'x'.repeat(12001), images: [] }, { text: 1, images: [] }, { text: '', images: null }]) assert.throws(() => validateCaptureDraft(value));
});
test('successive captures append images and keep text; cancelling retains previous input', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  const h = harness(); const draft = { text: 'Keep this text', images: [image] };
  await h.call({ type: 'SCREENSHOT_CAPTURE', draft }); await h.region();
  const next = (await h.call({ type: 'SCREENSHOT_TAKE' })).draft;
  assert.deepEqual(next, { text: draft.text, images: [image, image] });
  await h.call({ type: 'SCREENSHOT_CAPTURE', draft: next });
  await h.call({ type: 'SCREENSHOT_CANCEL', token: h.token }, source);
  assert.deepEqual((await h.call({ type: 'SCREENSHOT_TAKE' })).draft, next);
  assert.equal(h.captures, 1); assert.equal(h.created.length, 0);
});
test('a full or invalid input is rejected before starting capture', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  const h = harness();
  assert.equal((await h.call({ type: 'SCREENSHOT_CAPTURE', draft: { text: '', images: Array(MAX_IMAGES).fill(image) } })).error, 'imageLimit');
  assert.equal((await h.call({ type: 'SCREENSHOT_CAPTURE', draft: { text: '', images: ['https://host/secret'] } })).error, 'screenshotInvalid');
  assert.equal(h.token, undefined); assert.equal(h.captures, 0);
});
