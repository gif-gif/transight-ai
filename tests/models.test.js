import { mockChromeI18n } from '../test-support/chrome-i18n.js';
mockChromeI18n('en');
import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchModels, modelConnection } from '../src/shared/models.js';
const connection = { baseUrl: 'https://api.example.com/v1/', apiKey: ' test-key ' };
const response = ids => new Response(JSON.stringify({ data: ids.map(id => ({ id })) }));

test('model discovery accepts connection details without a model or translation consent', () => {
  assert.deepEqual(modelConnection(connection), { baseUrl: 'https://api.example.com/v1', apiKey: 'test-key' });
  assert.throws(() => modelConnection({ ...connection, apiKey: 'bad\nkey' }), /line breaks/);
  assert.throws(() => modelConnection({ ...connection, baseUrl: 'http://external.example/v1' }), /HTTPS/);
});
test('fetches authenticated model IDs, deduplicates, sorts, and ignores invalid IDs', async () => {
  const ids = await fetchModels(connection, { fetchImpl: async (url, init) => {
    assert.equal(url, 'https://api.example.com/v1/models');
    assert.equal(init.method, 'GET'); assert.equal(init.body, undefined);
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    return response(['z-model', 'a-model', ' a-model ', '', null, 42, 'x'.repeat(201), 'bad\nmodel']);
  } });
  assert.deepEqual(ids, ['a-model', 'z-model']);
});
test('local services can fetch models without an API key', async () => {
  await fetchModels({ baseUrl: 'http://localhost:11434/v1', apiKey: '' }, { fetchImpl: async (_, init) => {
    assert.equal(init.headers.Authorization, undefined); return response(['local-model']);
  } });
});
for (const [code, pattern] of [[401, /Authentication failed/], [403, /Access denied/], [404, /does not support/], [405, /does not support/], [429, /Rate limit/], [500, /HTTP 500/]]) {
  test(`model listing HTTP ${code} gives a safe localized error`, async () => {
    await assert.rejects(fetchModels(connection, { fetchImpl: async () => new Response('SECRET ECHO', { status: code }) }), pattern);
  });
}
test('invalid JSON, malformed and empty lists remain actionable', async () => {
  for (const body of ['not json', '{}', '{"data":{}}']) {
    await assert.rejects(fetchModels(connection, { fetchImpl: async () => new Response(body) }), /invalid model list/);
  }
  await assert.rejects(fetchModels(connection, { fetchImpl: async () => response([]) }), /No available models/);
});
test('network errors never expose provider details', async () => {
  await assert.rejects(fetchModels(connection, { fetchImpl: async () => { throw new TypeError('SECRET'); } }), /Could not connect/);
});
const hang = (_, { signal }) => new Promise((resolve, reject) => {
  if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'));
  else signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
});
test('model fetch timeout aborts the request', async () => {
  await assert.rejects(fetchModels(connection, { fetchImpl: hang, timeoutMs: 5 }), /timed out/);
});
test('changing connection details can cancel an in-flight request', async () => {
  const controller = new AbortController();
  const pending = fetchModels(connection, { fetchImpl: hang, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
