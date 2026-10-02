import test from 'node:test';
import assert from 'node:assert/strict';
import { credentialAccess } from '../src/shared/credential-access.js';
const runtime = { id: 'test', getURL: path => `chrome-extension://test/${path}` };
const allowed = (page, type, id = 'test') => credentialAccess({ type }, { id, url: page }, runtime);
test('inline unlock frame has only status/unlock privileges; popup has only status', () => {
  for (const type of ['VAULT_STATUS', 'VAULT_UNLOCK']) assert.equal(allowed(runtime.getURL('src/unlock/unlock.html'), type), true);
  for (const type of ['VAULT_SAVE', 'VAULT_RESET', 'VAULT_LOCK', 'FETCH_MODELS', 'CANCEL_MODELS', 'TRANSLATE']) assert.equal(allowed(runtime.getURL('src/unlock/unlock.html'), type), false);
  assert.equal(allowed(runtime.getURL('src/popup/popup.html?fallback=1'), 'VAULT_STATUS'), true);
  assert.equal(allowed(runtime.getURL('src/popup/popup.html'), 'VAULT_UNLOCK'), false);
  assert.equal(allowed(runtime.getURL('src/options/options.html'), 'VAULT_SAVE'), true);
});
test('web/content senders and lookalike URLs never gain credential access', () => {
  for (const url of ['https://example.com', runtime.getURL('src/unlock/unlock.html.evil'), runtime.getURL('src/other.html'), 'https://example.com/?chrome-extension://test/src/unlock/unlock.html']) {
    assert.equal(allowed(url, 'VAULT_UNLOCK'), false);
  }
  assert.equal(allowed(runtime.getURL('src/unlock/unlock.html'), 'VAULT_UNLOCK', 'other'), false);
  assert.equal(credentialAccess({ type: 'VAULT_UNLOCK' }, { id: 'test' }, runtime), false);
});
