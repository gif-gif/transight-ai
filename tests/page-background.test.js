import test from 'node:test';
import assert from 'node:assert/strict';
import { initI18n } from '../src/shared/i18n.js';
import { catalogs, mockChromeI18n } from '../test-support/chrome-i18n.js';
import { installPageTranslation } from '../src/shared/page-background.js';
const sender = { id: 'extension', tab: { id: 7, url: 'https://example.test/article' }, frameId: 0, documentId: 'doc1', url: 'https://example.test/article' };
const blocks = [{ id: 'b1', segments: [{ id: 's1', text: 'Hello' }] }];
const settings = { models: ['first'], baseUrl: 'https://provider.test/v1' };
function setup({ ready = Promise.resolve(), resolveConfig = async () => settings, runBatch = async () => ({ s1: '你好' }) } = {}) {
  mockChromeI18n(); const db = {}; const listeners = [];
  Object.assign(chrome, {
    runtime: { id: 'extension', getURL: path => `chrome-extension://extension/${path}`, onMessage: { addListener: fn => listeners.push(fn) } },
    storage: { onChanged: { addListener() {} }, local: { async get() { return { settings }; } }, session: {
      async get(key) { return structuredClone(key === null ? db : { [key]: db[key] }); },
      async set(values) { Object.assign(db, structuredClone(values)); },
      async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete db[key]; }
    } },
    permissions: { contains: async () => true }, tabs: { onRemoved: { addListener() {} } }
  });
  const install = () => { listeners.length = 0; installPageTranslation(ready, resolveConfig, runBatch); };
  install();
  const send = (message, from = sender) => new Promise(resolve => { if (listeners[0](message, from, resolve) === false) resolve(undefined); });
  return { db, send, install, begin: (id = 'job1') => send({ type: 'AI_PAGE_BEGIN', id, targetLanguage: 'zh-CN', model: 'first', provider: 'provider.test' }), batch: (id = 'job1', requestId = 'request1') => send({ type: 'AI_PAGE_BATCH', id, requestId, blocks }) };
}
test('page RPC rejects foreign senders, frames, missing jobs and forged batch IDs', async () => {
  const app = setup();
  for (const from of [{ ...sender, id: 'foreign' }, { ...sender, frameId: 1 }, { ...sender, url: 'file:///secret' }, { id: 'extension', url: 'chrome-extension://extension/src/popup/popup.html' }]) assert.equal(await app.send({ type: 'AI_PAGE_BEGIN', id: 'job1', targetLanguage: 'en' }, from), undefined);
  assert.equal((await app.batch()).code, 'pageSessionExpired');
  assert.equal((await app.begin()).ok, true);
  assert.equal((await app.batch('unknown')).code, 'pageSessionExpired');
  assert.equal((await app.send({ type: 'AI_PAGE_BATCH', id: 'job1', requestId: 'r', blocks: [{ id: 'b1', segments: [{ id: '__proto__', text: 'hello' }] }] })).code, 'pageInvalidBatch');
});
test('page sessions survive background reinstall and enforce budget without persisting text', async () => {
  const app = setup(); await app.begin();
  app.install(); assert.deepEqual((await app.batch()).translations, { s1: '你好' });
  assert.equal(JSON.stringify(app.db).includes('Hello'), false);
  assert.equal(JSON.stringify(app.db).includes('你好'), false);
  app.db['pageTranslation:7:doc1'].chars = 60000;
  assert.equal((await app.batch('job1', 'r2')).code, 'pageBudget');
  await app.begin('job2'); assert.equal((await app.batch('job2')).ok, true);
});
test('cancel aborts only the matching page session and refuses subsequent batches', async () => {
  let signal, release;
  const app = setup({ runBatch: async (_, __, value) => { signal = value; return new Promise(resolve => { release = resolve; }); } });
  await app.begin(); const pending = app.batch();
  while (!signal) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal((await app.send({ type: 'AI_PAGE_CANCEL', id: 'job1' })).ok, true);
  assert.equal(signal.aborted, true); release({ s1: 'late result' }); await pending;
  assert.equal((await app.batch()).code, 'pageSessionExpired');
  await app.begin('job2'); await app.send({ type: 'AI_PAGE_CANCEL', id: 'job1' });
  assert.equal(app.db['pageTranslation:7:doc1'].id, 'job2', 'late old cancel cannot delete new authorization');
});
test('cancel while preflight is pending never establishes an authorized job', async () => {
  let release;
  const app = setup({ ready: new Promise(resolve => { release = resolve; }) });
  const pending = app.begin(); const cancel = app.send({ type: 'AI_PAGE_CANCEL', id: 'job1' }); release();
  assert.equal((await pending).ok, false); assert.equal((await cancel).ok, true);
  assert.equal(app.db['pageTranslation:7:doc1'], undefined);
});
test('permission revocation and one-hour expiry stop page batching', async () => {
  const app = setup(); await app.begin();
  app.db['pageTranslation:7:doc1'].created -= 3600001;
  assert.equal((await app.batch()).code, 'pageSessionExpired');
  await app.begin(); chrome.permissions.contains = async () => false;
  assert.equal((await app.batch()).ok, false);
});

test('changed provider or first model requires a fresh disclosure', async () => {
  const app = setup();
  for (const extra of [{ model: 'other', provider: 'provider.test' }, { model: 'first', provider: 'old-provider.test' }]) {
    const response = await app.send({ type: 'AI_PAGE_BEGIN', id: 'job1', targetLanguage: 'zh-CN', ...extra });
    assert.equal(response.code, 'pageConfigChanged');
    assert.equal(app.db['pageTranslation:7:doc1'], undefined);
  }
});

const popupSender = { id: 'extension', url: 'chrome-extension://extension/src/popup/popup.html' };
const openMessage = { type: 'AI_PAGE_OPEN', targetLanguage: 'zh-CN' };
test('AI page open rejects restricted, loading, missing and removed tabs with AI-specific errors', async () => {
  const app = setup();
  for (const tab of [undefined, { id: 7, url: 'chrome://settings' }, { id: 7, url: 'https://chromewebstore.google.com/detail/example' }, { id: 7, url: sender.url, pendingUrl: 'https://other.test' }]) {
    chrome.tabs.query = async () => tab ? [tab] : [];
    assert.equal((await app.send(openMessage, popupSender)).error, 'aiPageUnavailable');
  }
  chrome.tabs.get = async () => { throw new Error('No tab'); };
  assert.equal((await app.send({ ...openMessage, tabId: 8 }, popupSender)).error, 'aiPageUnavailable');
});
test('AI page open reuses live controllers and repairs missing receivers without Google errors', async () => {
  const app = setup();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => ({ ok: true, json: async () => catalogs[url.split('/').at(-2)] });
  try { await initI18n(); } finally { globalThis.fetch = originalFetch; }
  chrome.tabs.query = async () => [sender.tab];
  const executions = [];
  chrome.scripting = { executeScript: async options => { executions.push(options); } };
  chrome.tabs.sendMessage = async () => ({ ok: true });
  assert.equal((await app.send(openMessage, popupSender)).ok, true);
  assert.equal(executions.length, 0, 'live controller must not be reset');
  let calls = 0;
  chrome.tabs.sendMessage = async () => { if (++calls === 1) throw new Error('Receiving end does not exist'); return { ok: true }; };
  assert.equal((await app.send(openMessage, sender)).ok, true);
  assert.equal(executions.length, 2);
  assert.equal(typeof executions[0].func, 'function');
  assert.equal(executions[1].files.includes('src/content/page-translation.js'), true);
  chrome.tabs.sendMessage = async () => { throw new Error('Receiving end does not exist'); };
  assert.equal((await app.send(openMessage, popupSender)).error, 'aiPageRefreshRequired');
  chrome.scripting.executeScript = async () => { throw new Error('Cannot access contents of url'); };
  assert.equal((await app.send(openMessage, popupSender)).error, 'aiPageInjectionFailed');
});
