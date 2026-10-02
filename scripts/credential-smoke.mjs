import { inlineUnlockSmoke } from './inline-unlock-smoke.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';

// Runs only against the disposable profile/local mock service in browser-smoke.mjs.
export async function credentialSmoke({ context, worker, page, sample, tabId, requests, screenshotDir, msg, setMode, modelBehaviors, restart }) {
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const password = 'local-test-unlock-password';
  const optionsUrl = `${origin}/src/options/options.html`;
  const rpc = (page, type, payload = {}) => page.evaluate(message => chrome.runtime.sendMessage(message), { type, ...payload });
  const openOptions = async () => {
    await page.goto(optionsUrl);
    await page.waitForFunction(() => document.querySelector('#vault-state').textContent && !document.querySelector('#vault-state').textContent.includes('…'));
  };
  const unlock = async () => {
    await page.locator('#unlock-password').fill(password);
    await page.locator('#unlock-vault').click();
    await page.locator('#test:enabled').waitFor();
  };
  setMode('success'); modelBehaviors.clear();
  await page.setViewportSize({ width: 1120, height: 980 });
  await openOptions(); await page.locator('#test:enabled').waitFor();
  const settings = await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
  const model = settings.models[0];
  const peer = await context.newPage(); await peer.goto(optionsUrl); await peer.locator('#test:enabled').waitFor();
  await peer.locator('#api-key').fill('unsaved-test-secret');

  // Content scripts cannot manage the vault or access either credential storage area.
  const isolation = await worker.evaluate(async tabId => (await chrome.scripting.executeScript({ target: { tabId }, func: async () => {
    const output = {};
    for (const area of ['local', 'session']) {
      try { await chrome.storage[area].get(null); output[area] = true; } catch { output[area] = false; }
    }
    try { output.rpc = await chrome.runtime.sendMessage({ type: 'VAULT_STATUS' }); } catch { output.rpc = null; }
    return output;
  } }))[0].result, tabId);
  assert.equal(isolation.local, false); assert.equal(isolation.session, false); assert.ok(!isolation.rpc?.ok);

  // Lock cancels an active request, clears other options pages, and blocks new requests.
  let release;
  modelBehaviors.set(model, { wait: new Promise(resolve => { release = resolve; }) });
  const before = requests.length;
  await page.evaluate(model => { window.pendingCredentialTest = chrome.runtime.sendMessage({ type: 'TRANSLATE', id: 'vault-cancel', text: 'Cancel on lock', model }); }, model);
  await page.waitForFunction(() => true); // Yield before waiting on the mock service.
  for (let attempt = 0; requests.length === before && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(requests.length, before + 1);
  await page.locator('#lock-vault').click(); await page.locator('#vault-unlock-fields:visible').waitFor();
  assert.equal((await page.evaluate(() => window.pendingCredentialTest)).ok, false);
  release(); modelBehaviors.clear();
  await peer.locator('#vault-unlock-fields:visible').waitFor();
  assert.equal(await peer.locator('#api-key').inputValue(), '');
  const count = requests.length;
  const locked = await rpc(page, 'TRANSLATE', { model, text: 'Must not be sent' });
  assert.equal(locked.error, msg('vaultLockedError')); assert.equal(requests.length, count);
  assert.equal((await rpc(page, 'FETCH_MODELS', { connection: { baseUrl: settings.baseUrl } })).error, msg('vaultLockedError'));
  assert.equal(await worker.evaluate(async () => (await chrome.storage.session.get('credentialSession')).credentialSession), undefined);
  await page.screenshot({ path: path.join(screenshotDir, 'options-locked.png'), fullPage: true });
  await unlock(); await peer.locator('#test:enabled').waitFor();
  await peer.close();
  const changed = settings.baseUrl.replace('127.0.0.1', 'localhost');
  assert.equal((await rpc(page, 'FETCH_MODELS', { connection: { baseUrl: changed } })).error, msg('vaultEndpointChanged'));

  await inlineUnlockSmoke({ context, worker, page, sample, tabId, requests, screenshotDir, msg, modelBehaviors });

  // Real browser shutdown/relaunch: persisted ciphertext survives, session key does not.
  ({ context, worker, page } = await restart());
  await openOptions(); await page.locator('#vault-unlock-fields:visible').waitFor();
  assert.equal((await rpc(page, 'TRANSLATE', { model, text: 'Locked after restart' })).error, msg('vaultLockedError'));
  await unlock();
  const result = await rpc(page, 'TRANSLATE', { model, text: 'Unlocked after restart' });
  assert.equal(result.ok, true); assert.equal(requests.at(-1).auth, 'Bearer local-test-key');

  // Deletion has a real confirmation and preserves preferences; no-auth services work.
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#reset-vault').click();
  assert.equal((await rpc(page, 'VAULT_STATUS')).vault.state, 'unlocked');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#reset-vault').click(); await page.locator('#reset-vault').waitFor({ state: 'hidden' });
  const remaining = await worker.evaluate(async () => chrome.storage.local.get(['settings', 'credentialVault']));
  assert.deepEqual(remaining.settings, settings); assert.equal(remaining.credentialVault, undefined);
  await page.locator('#save').click();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('saved'));
  assert.equal((await rpc(page, 'TRANSLATE', { model, text: 'No-auth request' })).ok, true);
  assert.equal(requests.at(-1).auth, undefined);

  // Preserve the legacy key until password encryption succeeds; requests are blocked.
  await worker.evaluate(async settings => chrome.storage.local.set({ settings: { ...settings, apiKey: 'legacy-test-key' } }), settings);
  ({ context, worker, page } = await restart());
  await openOptions();
  await page.waitForFunction(expected => document.querySelector('#vault-state').textContent === expected, msg('vaultMigration'));
  assert.equal(await worker.evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)).includes('legacy-test-key')), true);
  assert.equal((await rpc(page, 'TRANSLATE', { model, text: 'Must finish migration' })).error, msg('vaultMigrationRequired'));
  assert.equal(await page.locator('#api-key').inputValue(), '');
  await page.locator('#vault-password').fill(password); await page.locator('#vault-confirm').fill(password);
  await page.locator('#save').click();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('saved'));
  assert.equal((await rpc(page, 'TRANSLATE', { model, text: 'Migrated encrypted credential' })).ok, true);
  assert.equal(requests.at(-1).auth, 'Bearer legacy-test-key');
  const persisted = await worker.evaluate(async () => chrome.storage.local.get(null));
  assert.ok(persisted.credentialVault.ciphertext);
  assert.ok(!JSON.stringify(persisted).includes('legacy-test-key'));
  assert.ok(!JSON.stringify(persisted).includes(password));
  assert.equal(persisted.credentialMigration, undefined);
  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log('✓ Credential vault: ciphertext-only persistence, content isolation, cross-page lock, active-request cancellation, endpoint binding, real browser restart/unlock, confirmed reset, no-auth, and legacy migration');
}
