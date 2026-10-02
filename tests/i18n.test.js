import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { mockChromeI18n, catalogs } from '../test-support/chrome-i18n.js';
import { t, localizePage, resolveBrowserLanguage, normalizeLanguage } from '../src/shared/i18n.js';
import { languageName, DEFAULT_SETTINGS, validateSettings } from '../src/shared/settings.js';
import { buildRequest, translate } from '../src/shared/translator.js';

for (const [locale, label] of [['zh-CN', '翻译文字'], ['zh-TW', '翻譯文字'], ['en', 'Translate'], ['en-GB', 'Translate'], ['fr-FR', 'Translate'], ['ja', 'Translate']]) {
  test(`UI messages follow ${locale}, with English fallback`, () => {
    mockChromeI18n(locale);
    assert.equal(t('translate'), label);
    assert.equal(t('httpError', '503').includes('503'), true);
    assert.equal(DEFAULT_SETTINGS.targetLanguage, 'zh-CN');
  });
}

test('localized labels never change target-language IDs or translation prompts', () => {
  const settings = { ...DEFAULT_SETTINGS, consent: true, model: 'mock' };
  mockChromeI18n('zh-CN');
  assert.equal(languageName('en'), '英语');
  const request = buildRequest('Hello', settings, 'ja');
  mockChromeI18n('en-US');
  assert.equal(languageName('zh-CN'), 'Simplified Chinese');
  assert.deepEqual(buildRequest('Hello', settings, 'ja'), request);
  assert.equal(validateSettings(settings).targetLanguage, 'zh-CN');
});

test('page localization uses textContent and localized accessible attributes', () => {
  mockChromeI18n('en-US');
  const label = { dataset: { i18n: 'source' }, textContent: '原文' };
  const attributes = {};
  const input = { getAttribute: () => 'sourcePlaceholder', setAttribute: (key, value) => { attributes[key] = value; } };
  const root = { documentElement: {}, querySelectorAll: selector => selector === '[data-i18n]' ? [label] : selector === '[data-i18n-placeholder]' ? [input] : [] };
  localizePage(root);
  assert.equal(root.documentElement.lang, 'en');
  assert.equal(label.textContent, 'Source');
  assert.match(attributes.placeholder, /Type or paste/);
});

test('English validation and request errors remain localized and safe', async () => {
  mockChromeI18n('en-US');
  const settings = { ...DEFAULT_SETTINGS, consent: true, model: 'mock' };
  assert.throws(() => validateSettings({ ...settings, consent: false }), /Please agree/);
  assert.throws(() => buildRequest('x'.repeat(12001), settings), /12,000 characters/);
  await assert.rejects(translate('Hello', settings, 'en', { fetchImpl: async () => new Response('secret-echo', { status: 401 }) }), /Authentication failed/);
  await assert.rejects(translate('Hello', settings, 'en', { fetchImpl: async () => new Response('secret-echo', { status: 503 }) }), /HTTP 503/);
});

test('all catalogs cover every runtime and HTML message, including substitutions', () => {
  const keys = Object.keys(catalogs.en).sort();
  for (const catalog of Object.values(catalogs)) {
    assert.deepEqual(Object.keys(catalog).sort(), keys);
    for (const key of keys) {
      assert.ok(catalog[key].message.trim());
      assert.deepEqual(catalog[key].message.match(/\$[1-9]/g), catalogs.en[key].message.match(/\$[1-9]/g));
    }
  }
  function check(directory) {
    for (const file of readdirSync(directory, { withFileTypes: true })) {
      const url = new URL(file.name + (file.isDirectory() ? '/' : ''), directory);
      if (file.isDirectory()) check(url);
      else if (/\.(js|html)$/.test(file.name)) {
        const source = readFileSync(url, 'utf8');
        for (const match of source.matchAll(/\bt\('([^']+)'|data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) {
          assert.ok(catalogs.en[match[1] || match[2]], `Unknown message in ${url}: ${match[1] || match[2]}`);
        }
      }
    }
  }
  check(new URL('../src/', import.meta.url));
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.default_locale, 'en');
  for (const [, key] of JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)) assert.ok(catalogs.en[key]);
});

for (const [browser, expected] of [
  ['zh', 'zh-CN'], ['zh-CN', 'zh-CN'], ['zh-SG', 'zh-CN'], ['zh-Hans', 'zh-CN'],
  ['zh-TW', 'zh-TW'], ['zh-HK', 'zh-TW'], ['zh-MO', 'zh-TW'], ['zh-Hant', 'zh-TW'],
  ['zh_Hant_HK', 'zh-TW'], ['ZH_tw', 'zh-TW'], ['zh-Hans-HK', 'zh-CN'], ['zh-Hant-CN', 'zh-TW'],
  ['en-US', 'en'], ['fr-FR', 'en'], ['ja', 'en']
]) {
  test(`browser language ${browser} resolves to ${expected}`, () => assert.equal(resolveBrowserLanguage(browser), expected));
}
test('UI preference whitelist includes Traditional Chinese without changing translation targets', () => {
  assert.equal(normalizeLanguage('zh-TW'), 'zh-TW');
  assert.equal(normalizeLanguage('zh-HK'), 'auto');
  assert.equal(normalizeLanguage('invalid'), 'auto');
  mockChromeI18n('zh-TW');
  assert.equal(languageName('en'), '英語');
  assert.equal(languageName('zh-CN'), '簡體中文');
  assert.equal(DEFAULT_SETTINGS.targetLanguage, 'zh-CN');
});
test('Traditional Chinese contains translated branding, controls, errors, and model messages', () => {
  for (const key of ['extensionName', 'extensionDescription', 'translate', 'settings', 'save', 'http401', 'modelHint', 'fetchModels', 'retryTranslation', 'pinTranslation', 'contextMenu']) {
    assert.notEqual(catalogs.zh_TW[key].message, catalogs.zh_CN[key].message, key);
  }
});


test('English brand consistently includes AI without renaming Chinese locales', () => {
  for (const key of ['extensionName', 'brand', 'brandShort']) {
    assert.equal(catalogs.en[key].message, 'Transight AI');
  }
  for (const key of ['popupTitle', 'optionsTitle', 'versionBrand', 'contextMenu', 'panelLabel']) {
    assert.match(catalogs.en[key].message, /Transight AI/);
  }
  for (const { message } of Object.values(catalogs.en)) {
    if (message.includes('Transight')) {
      assert.match(message, /Transight AI/);
      assert.doesNotMatch(message, /Transight AI AI/);
    }
  }
  assert.equal(catalogs.zh_CN.extensionName.message, '译见 AI · 随手翻译');
  assert.equal(catalogs.zh_TW.extensionName.message, '譯見 AI · 隨手翻譯');
});
