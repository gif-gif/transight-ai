import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogs, mockChromeI18n } from '../test-support/chrome-i18n.js';

test('UI preference persists independently, reloads, falls back, and syncs across contexts', async () => {
  mockChromeI18n('fr-FR');
  const settings = { model: 'keep-model', targetLanguage: 'ja', consent: true };
  const store = { settings };
  const observers = [];
  chrome.runtime = { getURL: path => path };
  chrome.storage = {
    onChanged: { addListener: callback => observers.push(callback) },
    local: {
      get: async key => ({ [key]: store[key] }),
      set: async values => {
        for (const [key, value] of Object.entries(values)) {
          const oldValue = store[key]; store[key] = value;
          for (const callback of observers) callback({ [key]: { oldValue, newValue: value } }, 'local');
        }
      }
    }
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async path => ({ ok: true, json: async () => catalogs[path.split('/')[1]] });
  try {
    const first = await import('../src/shared/i18n.js?first');
    await first.initI18n();
    assert.equal(first.getLanguagePreference(), 'auto');
    assert.equal(first.t('translate'), catalogs.en.translate.message);
    let changes = 0;
    first.onLanguageChanged(() => changes++);
    for (const language of ['ja', 'ko']) {
      await first.setLanguagePreference(language);
      assert.equal(store.uiLanguage, language);
      assert.equal(first.t('translate'), catalogs[language].translate.message);
      assert.equal(first.localeSnapshot().language, language);
      assert.deepEqual(store.settings, settings);
    }
    changes = 0;
    await first.setLanguagePreference('zh-CN');
    assert.equal(store.uiLanguage, 'zh-CN');
    assert.equal(first.t('translate'), catalogs.zh_CN.translate.message);
    assert.equal(first.t('httpError', '503'), catalogs.zh_CN.httpError.message.replace('$1', '503'));
    assert.equal(changes, 1);
    const reopened = await import('../src/shared/i18n.js?reopened');
    await reopened.initI18n();
    assert.equal(reopened.getLanguagePreference(), 'zh-CN');
    await reopened.setLanguagePreference('zh-TW');
    assert.equal(store.uiLanguage, 'zh-TW');
    assert.equal(first.t('translate'), '翻譯文字');
    assert.equal(first.localeSnapshot().language, 'zh-TW');
    assert.equal(first.localeSnapshot().messages.pinTranslation, '固定翻譯浮動視窗');
    assert.equal(first.t('httpError', '503'), catalogs.zh_TW.httpError.message.replace('$1', '503'));
    const traditionalReopened = await import('../src/shared/i18n.js?traditionalReopened');
    await traditionalReopened.initI18n();
    assert.equal(traditionalReopened.getLanguagePreference(), 'zh-TW');
    assert.equal(traditionalReopened.t('settings'), '設定');
    await reopened.setLanguagePreference('en');
    assert.equal(first.t('translate'), catalogs.en.translate.message);
    await reopened.setLanguagePreference('auto');
    assert.equal(first.getLanguagePreference(), 'auto');
    assert.equal(first.getDisplayLanguage(), 'en');
    await chrome.storage.local.set({ uiLanguage: 'invalid' });
    assert.equal(first.getLanguagePreference(), 'auto');
    for (const [browser, display, label] of [['zh-HK', 'zh-TW', '翻譯文字'], ['zh-MO', 'zh-TW', '翻譯文字'], ['zh-Hant', 'zh-TW', '翻譯文字'], ['zh-SG', 'zh-CN', '翻译文字'], ['fr-FR', 'en', 'Translate']]) {
      chrome.i18n.getUILanguage = () => browser;
      assert.equal(first.getDisplayLanguage(), display);
      assert.equal(first.t('translate'), label, 'auto uses resolved catalog instead of native fallback');
    }
    assert.deepEqual(store.settings, settings);
  } finally { globalThis.fetch = originalFetch; }
});
