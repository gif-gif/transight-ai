import test from 'node:test';
import assert from 'node:assert/strict';
import { openContextTranslation } from '../src/shared/context-menu.js';

function setup(fail) {
  const calls = { injections: [], messages: [], drafts: [], windows: [] };
  globalThis.chrome = {
    runtime: { getURL: path => `chrome-extension://test/${path}` },
    scripting: { async executeScript(options) { calls.injections.push(options); if (fail === 'inject') throw Error('restricted'); } },
    tabs: { async sendMessage(...args) { calls.messages.push(args); if (fail === 'send') throw Error('no receiver'); return { ok: fail !== 'init' }; } },
    storage: { session: { async set(value) { calls.drafts.push(value); } } },
    windows: { async create(value) { calls.windows.push(value); } }
  };
  return calls;
}
for (const frameId of [undefined, 4]) test(`context menu opens the shared floating view in frame ${frameId ?? 0}`, async () => {
  const calls = setup();
  await openContextTranslation({ menuItemId: 'yijian-translate', selectionText: '<img src=x> selected text', frameId }, { id: 8 });
  assert.deepEqual(calls.injections, [{ target: { tabId: 8, frameIds: [frameId ?? 0] }, files: ['src/shared/translation-view.js', 'src/content/selection.js'] }]);
  assert.deepEqual(calls.messages, [[8, { type: 'SELECTION_OPEN', text: '<img src=x> selected text' }, { frameId: frameId ?? 0 }]]);
  assert.deepEqual(calls.drafts, []); assert.deepEqual(calls.windows, []);
});
for (const failure of ['inject', 'send', 'init']) test(`context ${failure} failure preserves the standalone fallback`, async () => {
  const calls = setup(failure);
  await openContextTranslation({ menuItemId: 'yijian-translate', selectionText: 'selected text' }, { id: 8 });
  assert.deepEqual(calls.drafts, [{ contextDraft: 'selected text' }]);
  assert.deepEqual(calls.windows, [{ url: 'chrome-extension://test/src/popup/popup.html?fallback=1', type: 'popup', width: 400, height: 740 }]);
});
test('unrelated, empty and tabless context-menu events are ignored', async () => {
  const calls = setup();
  await openContextTranslation({ menuItemId: 'other', selectionText: 'hello' }, { id: 8 });
  await openContextTranslation({ menuItemId: 'yijian-translate', selectionText: '' }, { id: 8 });
  await openContextTranslation({ menuItemId: 'yijian-translate', selectionText: 'hello' }, undefined);
  assert.deepEqual(calls, { injections: [], messages: [], drafts: [], windows: [] });
});
