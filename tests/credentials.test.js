import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { mockChromeI18n } from '../test-support/chrome-i18n.js';
import { createCredentialStore, encryptCredential, decryptCredential, KDF_ITERATIONS } from '../src/shared/credentials.js';
import { getSettings } from '../src/shared/settings.js';
mockChromeI18n();
const password = 'a strong test password 2026';
const apiKey = 'test-secret-not-a-real-key';
const baseUrl = 'https://example.com/v1';
const config = { baseUrl, apiKey, models: ['one', 'two'], targetLanguage: 'en', style: 'natural', consent: true };
function area(initial = {}) {
  const data = structuredClone(initial);
  return { data,
    async get(keys) { return structuredClone(Object.fromEntries((typeof keys === 'string' ? [keys] : keys).map(key => [key, data[key]]))); },
    async set(values) { Object.assign(data, structuredClone(values)); },
    async remove(keys) { for (const key of typeof keys === 'string' ? [keys] : keys) delete data[key]; }
  };
}
function setup(local = {}) {
  const storage = { local: area(local), session: area() };
  return { storage, store: createCredentialStore(storage, webcrypto) };
}

test('AES-GCM round trip; random salt, IV and authenticated endpoint; strict KDF version', async () => {
  const vault = await encryptCredential(apiKey, password, baseUrl, webcrypto);
  assert.equal(vault.iterations, KDF_ITERATIONS);
  assert.equal(await decryptCredential(vault, password, webcrypto), apiKey);
  const second = await encryptCredential(apiKey, password, baseUrl, webcrypto);
  for (const field of ['iv', 'salt', 'ciphertext', 'id']) assert.notEqual(vault[field], second[field]);
  for (const changed of [{ baseUrl: 'https://other.example/v1' }, { iterations: 1 }, { version: 2 }, { ciphertext: 'AAAA' }, { iv: '' }, { salt: 'invalid' }]) {
    await assert.rejects(decryptCredential({ ...vault, ...changed }, password, webcrypto));
  }
  const ciphertext = Buffer.from(vault.ciphertext, 'base64'); ciphertext[0] ^= 1;
  await assert.rejects(decryptCredential({ ...vault, ciphertext: ciphertext.toString('base64') }, password, webcrypto));
  await assert.rejects(decryptCredential(vault, 'wrong password longer than 12', webcrypto));
  assert.ok(!JSON.stringify(vault).includes(apiKey));
});

test('save persists only ciphertext and non-secret settings; worker restart reuses session, browser restart locks', async () => {
  const { storage, store } = setup();
  assert.equal((await store.save(config, password, password)).state, 'unlocked');
  assert.equal(await store.resolve(baseUrl), apiKey);
  assert.equal(await createCredentialStore(storage, webcrypto).resolve(baseUrl), apiKey);
  assert.equal(Object.hasOwn(storage.local.data.settings, 'apiKey'), false);
  assert.ok(!JSON.stringify(storage.local.data).includes(apiKey));
  assert.ok(!JSON.stringify(storage).includes(password));
  storage.session = area();
  const restarted = createCredentialStore(storage, webcrypto);
  assert.equal((await restarted.status()).state, 'locked');
  await assert.rejects(restarted.resolve(baseUrl));
  await assert.rejects(restarted.unlock('incorrect but long password'));
  assert.deepEqual(storage.session.data, {});
  await restarted.unlock(password);
  assert.equal(await restarted.resolve(baseUrl), apiKey);
});

test('lock, reset, absent key and no-auth service', async () => {
  const { storage, store } = setup();
  await store.save(config, password, password);
  await store.lock();
  await assert.rejects(store.resolve(baseUrl));
  await assert.rejects(store.resolve(baseUrl, 'override-while-locked'));
  await assert.rejects(store.save({ ...config, apiKey: '' }));
  await store.reset();
  assert.equal((await store.status()).state, 'empty');
  assert.equal(await store.resolve(baseUrl), '');
  assert.equal(storage.local.data.settings.baseUrl, baseUrl);
  await store.save({ ...config, apiKey: '' });
  assert.equal(storage.local.data.credentialVault, undefined);
  assert.deepEqual(storage.session.data, {});
});

test('preserves ciphertext on preference-only save; password rotation and key replacement', async () => {
  const { storage, store } = setup();
  await store.save(config, password, password);
  const original = structuredClone(storage.local.data.credentialVault);
  await store.save({ ...config, apiKey: '', targetLanguage: 'zh-TW' });
  assert.deepEqual(storage.local.data.credentialVault, original);
  const nextPassword = 'a different password 2026';
  await store.save({ ...config, apiKey: '' }, nextPassword, nextPassword);
  await store.lock();
  await assert.rejects(store.unlock(password));
  await store.unlock(nextPassword);
  assert.equal(await store.resolve(baseUrl), apiKey);
  await store.save({ ...config, apiKey: 'replacement' }, password, password);
  assert.equal(await store.resolve(baseUrl), 'replacement');
});

test('refuses implicit credential reuse across provider endpoints', async () => {
  const { store } = setup();
  await store.save(config, password, password);
  const other = 'https://other.example/v1';
  await assert.rejects(store.resolve(other));
  await assert.rejects(store.save({ ...config, baseUrl: other, apiKey: '' }));
  await store.save({ ...config, baseUrl: other, apiKey: 'explicit-new-key' }, password, password);
  assert.equal(await store.resolve(other), 'explicit-new-key');
  await assert.rejects(store.resolve(baseUrl));
});

test('six-character passwords can save and unlock; five characters are rejected', async () => {
  const { storage, store } = setup();
  await assert.rejects(store.save(config, 'abc12', 'abc12'));
  assert.deepEqual(storage.local.data, {});
  await store.save(config, 'abc123', 'abc123');
  await store.lock();
  await assert.rejects(store.unlock('abc12'));
  assert.equal((await store.status()).state, 'locked');
  await store.unlock('abc123');
  assert.equal(await store.resolve(baseUrl), apiKey);
});

test('invalid passwords and keys do not write any state', async () => {
  const { storage, store } = setup();
  for (const pass of ['', 'short', 'a'.repeat(1025)]) await assert.rejects(store.save(config, pass, pass));
  await assert.rejects(store.save(config, password, password + '!'));
  await assert.rejects(store.save({ ...config, apiKey: 'a'.repeat(8193) }, password, password));
  assert.deepEqual(storage.local.data, {});
  assert.deepEqual(storage.session.data, {});
});

test('legacy migration blocks requests and deletes plaintext only after successful encryption', async () => {
  const { storage, store } = setup({ settings: config });
  await store.migrate();
  assert.equal((await store.status()).state, 'migration');
  assert.equal(storage.local.data.settings.apiKey, apiKey);
  assert.deepEqual(storage.session.data, {});
  await assert.rejects(store.resolve(baseUrl));
  await store.migrate(); // Idempotent across worker restart.
  await store.save({ ...config, apiKey: '' }, password, password);
  assert.equal(storage.local.data.credentialMigration, undefined);
  assert.equal(await store.resolve(baseUrl), apiKey);
});

test('browser restart during legacy migration preserves the key but never sends it', async () => {
  const { storage, store } = setup({ settings: config });
  await store.migrate(); await storage.session.remove('credentialSession');
  assert.equal((await store.status()).hasSession, false);
  await assert.rejects(store.resolve(baseUrl));
  await store.save({ ...config, apiKey: '' }, password, password);
  assert.equal(Object.hasOwn(storage.local.data.settings, 'apiKey'), false);
  assert.equal(await store.resolve(baseUrl), apiKey);
});

test('failed encryption persistence preserves the only legacy copy', async () => {
  const { storage, store } = setup({ settings: config });
  await store.migrate();
  storage.local.set = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(store.save({ ...config, apiKey: '' }, password, password));
  assert.equal(storage.local.data.settings.apiKey, apiKey);
});

test('failed encrypted write retains old ciphertext; failed session cache leaves new vault locked', async () => {
  const { storage, store } = setup();
  await store.save(config, password, password);
  const original = structuredClone(storage.local.data);
  const set = storage.local.set;
  storage.local.set = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(store.save({ ...config, apiKey: 'replacement' }, password, password));
  assert.deepEqual(storage.local.data, original);
  storage.local.set = set;
  storage.session.set = async () => { throw new Error('session unavailable'); };
  await assert.rejects(store.save({ ...config, apiKey: 'replacement' }, password, password));
  assert.equal((await store.status()).state, 'locked');
  assert.ok(!JSON.stringify(storage.local.data).includes('replacement'));
});

test('lock/reset invalidate queued save and unlock, never restoring session after lock', async () => {
  const { storage, store } = setup();
  await store.save(config, password, password);
  await store.lock();
  const unlock = store.unlock(password);
  const lock = store.lock();
  await assert.rejects(unlock); await lock;
  assert.deepEqual(storage.session.data, {});
  const save = store.save(config, password, password);
  const reset = store.reset();
  await assert.rejects(save); await reset;
  assert.deepEqual(storage.session.data, {});
  assert.equal(storage.local.data.credentialVault, undefined);
});

test('public settings omit legacy keys even before migration; stale sessions cannot unlock changed vault', async () => {
  const { storage, store } = setup({ settings: config });
  const previous = chrome.storage;
  chrome.storage = storage;
  try { assert.equal((await getSettings()).apiKey, ''); } finally { chrome.storage = previous; }
  await store.migrate(); await store.save({ ...config, apiKey: '' }, password, password);
  storage.session.data.credentialSession.id = 'stale';
  assert.equal((await store.status()).state, 'locked');
  await assert.rejects(store.resolve(baseUrl));
});
