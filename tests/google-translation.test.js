import test from 'node:test';
import assert from 'node:assert/strict';
import { googleTextTranslationUrl, openGoogleTextTranslation, MAX_GOOGLE_TEXT_LENGTH } from '../src/shared/google-translation.js';
import { LANGUAGES } from '../src/shared/settings.js';

const request = { text: '  Hello & tl=ru\n你好 + #?% 😀  ', targetLanguage: 'zh-CN' };
test('Google text URL preserves full text and current target without query injection', () => {
  for (const targetLanguage of Object.keys(LANGUAGES)) {
    const url = new URL(googleTextTranslationUrl({ ...request, targetLanguage }));
    assert.equal(url.origin + url.pathname, 'https://translate.google.com/');
    assert.equal(url.searchParams.get('text'), request.text);
    assert.equal(url.searchParams.get('tl'), targetLanguage);
    assert.equal(url.searchParams.get('sl'), 'auto');
    assert.equal(url.searchParams.get('op'), 'translate');
    assert.deepEqual([...url.searchParams.keys()], ['hl', 'sl', 'tl', 'text', 'op']);
    assert.equal(url.hash, '');
  }
});
test('Google source language and all interface languages are carried through', () => {
  for (const uiLanguage of ['en', 'zh-CN', 'zh-TW', 'ja', 'ko']) {
    const url = new URL(googleTextTranslationUrl({ ...request, sourceLanguage: 'fr', uiLanguage }));
    assert.equal(url.searchParams.get('hl'), uiLanguage);
    assert.equal(url.searchParams.get('sl'), 'fr');
  }
  assert.equal(new URL(googleTextTranslationUrl({ ...request, uiLanguage: '__proto__' })).searchParams.get('hl'), 'en');
});
test('Google text rejects missing, oversized and invalid input without silent truncation', () => {
  for (const text of [undefined, null, 0, {}, '', ' \n\t']) assert.throws(() => googleTextTranslationUrl({ ...request, text }), /googleTextRequired/);
  assert.throws(() => googleTextTranslationUrl({ ...request, text: 'a'.repeat(MAX_GOOGLE_TEXT_LENGTH + 1) }), /googleTextTooLong/);
  assert.equal(new URL(googleTextTranslationUrl({ ...request, text: 'a'.repeat(MAX_GOOGLE_TEXT_LENGTH) })).searchParams.get('text').length, MAX_GOOGLE_TEXT_LENGTH);
  for (const targetLanguage of ['auto', '', '__proto__', undefined]) assert.throws(() => googleTextTranslationUrl({ ...request, targetLanguage }), /invalidTarget/);
  assert.throws(() => googleTextTranslationUrl({ ...request, sourceLanguage: 'bad' }), /googleTranslationFailed/);
});
test('Google text checks fresh enabled preference and sends no key, images, or provider configuration', async () => {
  const created = [];
  let enabled = true;
  const services = { getSettings: async () => ({ googleTranslationEnabled: enabled, apiKey: 'SECRET', baseUrl: 'https://private.test' }), tabs: { create: async options => created.push(options) } };
  await openGoogleTextTranslation({ ...request, images: ['private-image'], apiKey: 'SECRET' }, services);
  assert.deepEqual(Object.keys(created[0]), ['url']);
  assert.equal(created[0].url.includes('SECRET'), false);
  assert.equal(created[0].url.includes('private'), false);
  enabled = false;
  await assert.rejects(openGoogleTextTranslation(request, services), /googleTranslationDisabled/);
  assert.equal(created.length, 1);
  enabled = true;
  services.tabs.create = async () => { throw Error('browser failed'); };
  await assert.rejects(openGoogleTextTranslation(request, services), /browser failed/);
});
