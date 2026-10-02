import { mockChromeI18n } from '../test-support/chrome-i18n.js';
mockChromeI18n();
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBaseUrl, permissionOrigin, validateSettings, DEFAULT_SETTINGS } from '../src/shared/settings.js';
const config = { ...DEFAULT_SETTINGS, model: 'test-model', consent: true };
test('normalize paths, whitespace, trailing slash and complete endpoint', () => {
  assert.equal(normalizeBaseUrl(' https://example.com/v1/// '), 'https://example.com/v1');
  assert.equal(normalizeBaseUrl('https://example.com/v1/chat/completions/'), 'https://example.com/v1');
  assert.equal(normalizeBaseUrl('https://example.com'), 'https://example.com');
});
test('reject insecure, malformed and credential-bearing endpoints', () => {
  for (const url of ['no-url', 'http://example.com/v1', 'file:///tmp/a', 'https://a:b@example.com', 'https://example.com?key=secret', 'https://example.com/#fragment', 'http://localhost.evil.com']) {
    assert.throws(() => normalizeBaseUrl(url));
  }
});
test('allow HTTP only on explicit loopback hosts; permission pattern excludes port', () => {
  assert.equal(normalizeBaseUrl('http://localhost:11434/v1'), 'http://localhost:11434/v1');
  assert.equal(permissionOrigin('http://127.0.0.1:8000/v1'), 'http://127.0.0.1/*');
  assert.equal(permissionOrigin('https://example.com:8443/api/v1'), 'https://example.com/*');
});
test('validate model, style, language and explicit consent', () => {
  assert.equal(validateSettings(config).model, 'test-model');
  for (const override of [{ model: '' }, { model: 'x'.repeat(201) }, { consent: false }, { consent: 'true' }, { style: 'bad' }, { style: 'toString' }, { targetLanguage: '__proto__' }, { apiKey: 'abc\ndef' }]) {
    assert.throws(() => validateSettings({ ...config, ...override }));
  }
  assert.equal(validateSettings({ ...config, apiKey: ' token ' }).apiKey, 'token');
});

test('multi-model settings migrate legacy values and normalize duplicates in order', async () => {
  const { selectedModels, parseModelInput } = await import('../src/shared/settings.js');
  assert.deepEqual(selectedModels({ model: ' legacy ' }), ['legacy']);
  assert.deepEqual(parseModelInput(' model-a, model-b，model-a\nmodel-c '), ['model-a', 'model-b', 'model-c']);
  const settings = validateSettings({ ...config, models: [' a ', 'b', 'a'] });
  assert.deepEqual(settings.models, ['a', 'b']); assert.equal(settings.model, 'a');
  for (const models of [[], 'not-an-array', [5], ['x'.repeat(201)], ['a\nb'], ['a','b','c','d','e','f']]) {
    assert.throws(() => validateSettings({ ...config, models }));
  }
});

test('reading legacy storage exposes a compatible multi-model selection', async () => {
  const { getSettings } = await import('../src/shared/settings.js');
  const original = chrome.storage;
  try {
    chrome.storage = { local: { get: async () => ({ settings: config }) } };
    const settings = await getSettings();
    assert.deepEqual(settings.models, ['test-model']); assert.equal(settings.model, 'test-model');
  } finally { chrome.storage = original; }
});
