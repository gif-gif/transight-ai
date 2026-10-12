import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES } from '../src/shared/settings.js';
import { googleWebsiteTranslationUrl, openWebsiteTranslation } from '../src/shared/website-translation.js';

test('Google whole-page translation preserves every supported target and auto-detects the source', () => {
  for (const target of Object.keys(LANGUAGES)) {
    const url = new URL(googleWebsiteTranslationUrl('https://example.com/article', target));
    assert.equal(url.origin, 'https://translate.google.com');
    assert.equal(url.pathname, '/translate');
    assert.equal(url.searchParams.get('sl'), 'auto');
    assert.equal(url.searchParams.get('tl'), target);
    assert.equal(url.searchParams.get('u'), 'https://example.com/article');
    assert.deepEqual([...url.searchParams.keys()], ['sl', 'tl', 'u']);
  }
});
test('page URLs are encoded without losing queries or fragments or injecting Google options', () => {
  const page = 'https://example.com/文章?q=a%26b&tl=ru&sl=fr#section';
  const url = new URL(googleWebsiteTranslationUrl(page, 'ja'));
  assert.equal(url.searchParams.get('u'), new URL(page).href);
  assert.equal(url.searchParams.get('tl'), 'ja');
  assert.equal(url.searchParams.get('sl'), 'auto');
  assert.equal(new URL(googleWebsiteTranslationUrl('http://example.com/', 'en')).searchParams.get('u'), 'http://example.com/');
});
test('unsupported pages and embedded credentials are never sent to Google', () => {
  for (const page of [undefined, '', 'not a url', 'chrome://settings', 'chrome-extension://id/popup.html', 'file:///private.txt', 'about:blank', 'data:text/html,secret', 'javascript:alert(1)', 'ftp://example.com', 'https://user:password@example.com']) {
    assert.throws(() => googleWebsiteTranslationUrl(page, 'en'), /websiteTranslationUnavailable/);
  }
  for (const target of ['auto', '', '__proto__', undefined]) assert.throws(() => googleWebsiteTranslationUrl('https://example.com', target), /invalidTarget/);
});
test('explicit opening queries the active tab and only creates a new tab with the selected target', async () => {
  const calls = [];
  const tabs = {
    async query(options) { calls.push(options); return [{ id: 7, url: 'https://example.com' }]; },
    async create(options) { calls.push(options); return { id: 8 }; }
  };
  assert.deepEqual(await openWebsiteTranslation('ko', tabs), { id: 8 });
  assert.deepEqual(calls[0], { active: true, currentWindow: true });
  assert.equal(new URL(calls[1].url).searchParams.get('tl'), 'ko');
  assert.deepEqual(Object.keys(calls[1]), ['url']);
});
test('unavailable tab and browser failures do not fall back to sending other data', async () => {
  let created = false;
  await assert.rejects(openWebsiteTranslation('en', { query: async () => [], create: async () => { created = true; } }), /websiteTranslationUnavailable/);
  assert.equal(created, false);
  await assert.rejects(openWebsiteTranslation('en', { query: async () => { throw Error('browser failed'); } }), /browser failed/);
});
