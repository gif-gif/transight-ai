import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { mockChromeI18n } from '../test-support/chrome-i18n.js';
import { sitePattern, publicSettings, installSelection } from '../src/shared/selection-background.js';
import { DEFAULT_SETTINGS } from '../src/shared/settings.js';
mockChromeI18n();

test('selection site grants are exact HTTP(S) host patterns, never privileged schemes', () => {
  assert.equal(sitePattern('https://news.example.com/story?a=1'), 'https://news.example.com/*');
  assert.equal(sitePattern('http://localhost:1234/sample'), 'http://localhost/*');
  for (const url of ['chrome://extensions', 'file:///secret', 'about:blank', 'data:text/plain,hello', 'invalid']) assert.equal(sitePattern(url), null);
});
test('only explicitly whitelisted configuration crosses into a webpage', () => {
  assert.deepEqual(publicSettings({ apiKey: 'SECRET', baseUrl: 'https://private.example', model: 'test', consent: true, targetLanguage: 'ja', futureSecret: 'SECRET', systemPrompt: 'PRIVATE TEMPLATE' }), { model: 'test', models: ['test'], consent: true, targetLanguage: 'ja', selectionEnabled: true });
});
test('global selection access, legacy migration, ordering and permission revocation', async () => {
  const event = () => ({ listeners: [], addListener(fn) { this.listeners.push(fn); }, fire(...args) { this.listeners.forEach(fn => fn(...args)); } });
  const data = { selectionOrigins: ['https://old.example/*'], settings: { ...DEFAULT_SETTINGS, model: 'test', consent: true, baseUrl: 'https://api.example/v1' } };
  const grants = new Set(), registered = new Map([['transight-selection-old', { id: 'transight-selection-old' }], ['unrelated', { id: 'unrelated' }]]), messages = [], translations = [];
  const tab = { id: 7, url: 'https://reading.example/article' };
  Object.assign(chrome, {
    runtime: { id: 'test-extension', getURL: path => `chrome-extension://test-extension/${path}`, onMessage: event(), onStartup: event(), onInstalled: event() },
    storage: { local: { async get(key) { return { [key]: data[key] }; }, async set(values) { Object.assign(data, values); }, async remove(key) { delete data[key]; } }, onChanged: event() },
    tabs: { async get() { return tab; }, async query() { return [tab]; }, async sendMessage(id, message) { messages.push(message); }, onRemoved: event() },
    permissions: { async contains({ origins }) { return origins.every(pattern => grants.has(pattern)); }, async remove({ origins }) { origins.forEach(pattern => grants.delete(pattern)); }, onRemoved: event() },
    scripting: {
      async getRegisteredContentScripts() { return [...registered.values()]; },
      async registerContentScripts(scripts) { scripts.forEach(script => registered.set(script.id, script)); },
      async unregisterContentScripts({ ids }) { ids.forEach(id => registered.delete(id)); }
    }
  });
  const ready = Promise.resolve();
  installSelection(ready, async (text, targetLanguage, signal, model) => {
    translations.push({ text, targetLanguage, signal, model });
    if (text === 'slow') await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    return { text: 'translated', model: 'test', targetLanguage };
  });
  const sender = { id: chrome.runtime.id, tab, frameId: 0, documentId: 'document-1', url: tab.url };
  const extension = { id: chrome.runtime.id, url: chrome.runtime.getURL('src/popup/popup.html') };
  const handler = chrome.runtime.onMessage.listeners[0];
  const message = (payload, from = sender) => new Promise(resolve => { if (!handler(payload, from, resolve)) resolve(null); });
  const tick = () => new Promise(resolve => setTimeout(resolve, 5));
  await tick();
  assert.equal((await message({ type: 'SELECTION_TRANSLATE', id: 'no-grant', text: 'text' })).ok, false);
  assert.equal(translations.length, 0);
  assert.equal(await message({ type: 'SELECTION_INIT' }, { ...sender, id: 'another-extension' }), null);
  assert.equal((await message({ type: 'SELECTION_INIT' }, { ...sender, frameId: 2 })).ok, false, 'frames still require their own site grant');
  assert.equal(await message({ type: 'SELECTION_INIT' }, { ...sender, frameId: -1 }), null);
  assert.equal(await message({ type: 'SELECTION_SITE_SET', tabId: 7, enabled: true }, extension), null);
  assert.equal(data.selectionOrigins, undefined);
  assert.deepEqual([...registered.keys()], ['unrelated'], 'only obsolete selection registrations are removed');
  grants.add('https://reading.example/*');
  const beforeTargetChange = structuredClone(data.settings);
  assert.equal((await message({ type: 'SELECTION_TARGET_LANGUAGE', value: 'ko' })).ok, true);
  assert.equal(data.targetLanguagePreference, 'ko');
  assert.deepEqual(data.settings, beforeTargetChange, 'content may only update the target preference');
  assert.equal((await message({ type: 'SELECTION_TARGET_LANGUAGE', value: '__proto__' })).ok, false);
  assert.equal(await message({ type: 'SELECTION_TARGET_LANGUAGE', value: 'en' }, extension), null);
  assert.equal(data.targetLanguagePreference, 'ko');

  assert.equal((await message({ type: 'SELECTION_SITE_SET', tabId: 7, enabled: false })).ok, false, 'old site-management messages are rejected');
  assert.equal((await message({ type: 'SELECTION_TRANSLATE', id: 'ok', text: 'hello', targetLanguage: 'ja' })).text, 'translated');
  const pending = message({ type: 'SELECTION_TRANSLATE', id: 'early-close', text: 'must never fetch' });
  await message({ type: 'SELECTION_CANCEL', id: 'early-close' }); await pending;
  assert.equal(translations.length, 1, 'close during permission checks prevents fetch');
  const slow = message({ type: 'SELECTION_TRANSLATE', id: 'old', text: 'slow' }); await tick();
  await message({ type: 'SELECTION_TRANSLATE', id: 'new', text: 'newest' }); await slow;
  assert.equal(translations[1].signal.aborted, true);
  const parallelA = message({ type: 'SELECTION_TRANSLATE', id: 'parallel-a', model: 'a', text: 'slow' });
  const parallelB = message({ type: 'SELECTION_TRANSLATE', id: 'parallel-b', model: 'b', text: 'slow' });
  await tick();
  const [a, b] = translations.slice(-2);
  assert.deepEqual([a.model, b.model], ['a', 'b']);
  assert.equal(a.signal.aborted, false); assert.equal(b.signal.aborted, false);
  await message({ type: 'SELECTION_CANCEL', id: 'parallel-a' }); await parallelA;
  assert.equal(a.signal.aborted, true); assert.equal(b.signal.aborted, false);
  await message({ type: 'SELECTION_CANCEL', id: 'parallel-b' }); await parallelB;
  assert.equal(b.signal.aborted, true);
  const frame = { ...sender, frameId: 2, documentId: 'frame-document' };
  const topPending = message({ type: 'SELECTION_TRANSLATE', id: 'top', text: 'slow', model: 'same' });
  const framePending = message({ type: 'SELECTION_TRANSLATE', id: 'frame', text: 'slow', model: 'same' }, frame);
  await tick();
  const [topJob, frameJob] = translations.slice(-2);
  assert.equal(topJob.signal.aborted, false);
  assert.equal(frameJob.signal.aborted, false, 'same-model jobs in separate documents do not cancel each other');
  await message({ type: 'SELECTION_CANCEL', id: 'frame' });
  assert.equal(frameJob.signal.aborted, false, 'top frame cannot cancel an iframe job');
  await message({ type: 'SELECTION_CANCEL', id: 'frame' }, frame); await framePending;
  await message({ type: 'SELECTION_CANCEL', id: 'top' }); await topPending;
  const revokePending = message({ type: 'SELECTION_TRANSLATE', id: 'revoked', text: 'slow' }); await tick();
  grants.clear(); chrome.permissions.onRemoved.fire({ origins: ['https://reading.example/*'] });
  await tick(); await revokePending;
  assert.deepEqual([...registered.keys()], ['unrelated']); assert.equal(data.selectionOrigins, undefined);
  assert.equal(translations.at(-1).signal.aborted, true);
  assert.ok(messages.some(item => item.type === 'SELECTION_DISABLED'));
  assert.equal((await message({ type: 'SELECTION_TRANSLATE', id: 'after-revoke', text: 'blocked' })).ok, false);
});


test('manifest injects selection UI on every ordinary website without per-site opt-in', () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
  assert.deepEqual(manifest.host_permissions.sort(), ['http://*/*', 'https://*/*']);
  assert.equal(manifest.optional_host_permissions, undefined);
  assert.deepEqual(manifest.content_scripts, [{ matches: ['http://*/*', 'https://*/*'], js: ['src/shared/speech-client.js', 'src/shared/translation-view.js', 'src/content/selection.js'], run_at: 'document_idle', all_frames: false }]);
});
