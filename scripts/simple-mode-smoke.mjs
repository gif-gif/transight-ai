import assert from 'node:assert/strict';
import path from 'node:path';

export async function simpleModeSmoke({ context, worker, sample, ui, until, click, select, requests, screenshotDir, msg, setMode }) {
  const before = await worker.evaluate(() => chrome.storage.local.get(['settings', 'translationMode', 'targetLanguagePreference', 'uiLanguage']));
  const options = await context.newPage();
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const done = async () => until(async () => await ui('#status') === msg('complete'));
  try {
    await ui('#close-view', 'function(){this.click()}');
    await worker.evaluate(async settings => {
      await chrome.storage.local.remove('translationMode');
      await chrome.storage.local.set({ settings: { ...settings, model: 'simple-first', models: ['simple-first', 'simple-second', 'simple-third'] } });
    }, before.settings);
    await options.goto(`${origin}/src/options/options.html`);
    await options.locator('#save:enabled').waitFor();
    assert.equal(await options.locator('#translation-mode').isChecked(), false, 'legacy installations default to Full');
    await options.locator('#translation-mode').check();
    await until(async () => (await worker.evaluate(() => chrome.storage.local.get('translationMode'))).translationMode === 'simple');
    await options.reload(); await options.locator('#save:enabled').waitFor();
    assert.equal(await options.locator('#translation-mode').isChecked(), true);

    const start = requests.length;
    await select('A little understanding brings us closer.');
    assert.equal(requests.length, start, 'selecting alone never uploads text');
    await click('.selection-bubble'); await done();
    assert.equal(requests.length, start + 1);
    assert.equal(requests.at(-1).body.model, 'simple-first');
    assert.equal(await ui('.translation-view', 'function(){return this.classList.contains("simple-translate")}'), true);
    assert.equal(await ui('#results-list', 'function(){return this.children.length}'), 1);
    assert.equal(await ui('#source', 'function(){return this.readOnly}'), false);
    assert.equal(await ui('#source', 'function(){return this.value}'), 'A little understanding brings us closer.');
    for (const selector of ['#translate', '.card-foot', '.ui-language-control']) {
      assert.equal(await ui(selector, 'function(){return this.getClientRects().length}'), 0, selector + ' is hidden');
    }
    assert.ok(await ui('#settings', 'function(){return this.getClientRects().length}'));
    assert.equal(await ui('#translation-mode'), '');
    assert.equal(await ui('#translation-mode', 'function(){return this.getAttribute("aria-label")}'), msg('switchFullMode'));
    assert.equal(await ui('#translation-mode svg', 'function(){return this.tagName}'), 'svg');
    const languageGap = await ui('.translation-view', 'function(){return this.querySelector(".language-row").getBoundingClientRect().top-this.querySelector(".topbar").getBoundingClientRect().bottom}');
    assert.ok(languageGap >= 12, `language row spacing: ${languageGap}`);
    for (const selector of ['.copy-result', '.speak-result']) {
      assert.ok(await ui(selector, 'function(){return this.getClientRects().length && !this.disabled}'));
    }
    await click('.copy-result');
    await until(async () => await ui('.copy-result', 'function(){return this.dataset.copied}') === 'true');
    await until(async () => await ui('.copy-result', 'function(){return this.dataset.copied}') === 'false');
    await worker.evaluate(() => {
      globalThis.simpleSpeechTest = { original: { getVoices: chrome.tts.getVoices, speak: chrome.tts.speak, stop: chrome.tts.stop }, calls: [], stops: 0 };
      chrome.tts.getVoices = callback => callback(['zh-CN','en-US','ja-JP','ko-KR','fr-FR'].map(lang => ({ voiceName: `Simple ${lang}`, lang, remote: false, eventTypes: ['start','end','error'] })));
      chrome.tts.speak = (text, options, callback) => { simpleSpeechTest.calls.push({text, options}); callback?.(); options.onEvent({type:'start'}); };
      chrome.tts.stop = () => simpleSpeechTest.stops++;
    });
    await click('.speak-result');
    await until(async () => await ui('.speak-result', 'function(){return this.getAttribute("aria-pressed")}') === 'true');
    assert.equal(await worker.evaluate(() => simpleSpeechTest.calls.at(-1).text), await ui('.result'));
    await click('.speak-result');
    await until(async () => await ui('.speak-result', 'function(){return this.getAttribute("aria-pressed")}') === 'false');
    assert.equal(await worker.evaluate(() => simpleSpeechTest.stops), 1);
    assert.equal(await ui('.result-title h3'), msg('translation'));
    await sample.screenshot({ path: path.join(screenshotDir, 'selection-simple.png') });

    // Editable textarea: debounce, IME, blank text and superseded requests.
    const edit = async text => {
      await click('#source'); await sample.keyboard.press('ControlOrMeta+A'); await sample.keyboard.insertText(text);
    };
    const editsStart = requests.length;
    await edit('Editable original');
    await sample.keyboard.insertText(' with more words');
    await done();
    assert.equal(requests.length, editsStart + 1, 'rapid typing is one request');
    assert.equal(requests.at(-1).body.messages[1].content, 'Editable original with more words');
    const imeStart = requests.length;
    await ui('#source', 'function(){this.dispatchEvent(new CompositionEvent("compositionstart"));this.value="输入中的原文";this.dispatchEvent(new InputEvent("input",{bubbles:true,isComposing:true}))}');
    await new Promise(resolve => setTimeout(resolve, 750));
    assert.equal(requests.length, imeStart, 'IME composition never sends partial text');
    await ui('#source', 'function(){this.value="完成输入的原文";this.dispatchEvent(new CompositionEvent("compositionend"));this.dispatchEvent(new InputEvent("input",{bubbles:true}))}');
    await done(); assert.equal(requests.length, imeStart + 1);
    const blankStart = requests.length;
    await edit(''); await new Promise(resolve => setTimeout(resolve, 750));
    assert.equal(requests.length, blankStart, 'blank original is not translated');
    setMode('slow'); await edit('An obsolete original');
    await until(async () => requests.length > blankStart);
    assert.equal(await ui('#source', 'function(){return this.disabled}'), false);
    await edit('A newer original'); await done();
    assert.equal(requests.at(-1).body.messages[1].content, 'A newer original');
    setMode('success');
    await edit('A little understanding brings us closer.'); await done();

    await ui('#source-language', 'function(){this.value="en";this.dispatchEvent(new Event("change",{bubbles:true}))}'); await done();
    assert.ok(requests.at(-1).body.messages[0].content.includes('Source language: English (en).'));
    await ui('#target', 'function(){this.value="ko";this.dispatchEvent(new Event("change",{bubbles:true}))}'); await done();
    assert.ok(requests.at(-1).body.messages[0].content.includes('(ko)'));
    assert.equal((await worker.evaluate(() => chrome.storage.local.get('targetLanguagePreference'))).targetLanguagePreference, 'ko');

    // A newer language choice supersedes an in-flight automatic translation.
    setMode('slow');
    const slowStart = requests.length;
    await ui('#target', 'function(){this.value="ja";this.dispatchEvent(new Event("change",{bubbles:true}))}');
    await until(async () => requests.length > slowStart);
    assert.equal(await ui('#target', 'function(){return this.disabled}'), false);
    await ui('#target', 'function(){this.value="fr";this.dispatchEvent(new Event("change",{bubbles:true}))}');
    await done(); setMode('success');
    assert.ok(requests.at(-1).body.messages[0].content.includes('(fr)'));

    // Failure remains recoverable without adding a Translate button.
    setMode('unauthorized');
    await ui('#source-language', 'function(){this.value="auto";this.dispatchEvent(new Event("change",{bubbles:true}))}');
    await until(async () => await ui('.result-card', 'function(){return this.dataset.state}') === 'error');
    assert.ok(await ui('.result .settings-link', 'function(){return this.getClientRects().length}'));
    setMode('success'); const retryStart = requests.length;
    await click('.retry-result'); await done(); assert.equal(requests.length, retryStart + 1);

    const fullStart = requests.length;
    await click('#translation-mode'); await done();
    assert.equal(requests.length, fullStart + 3, 'Full restores all selected models exactly once');
    assert.equal(await ui('#results-list', 'function(){return this.children.length}'), 3);
    assert.equal(await ui('#source', 'function(){return this.value}'), 'A little understanding brings us closer.');
    assert.ok(await ui('#translate', 'function(){return this.getClientRects().length}'));
    assert.equal(await options.locator('#translation-mode').isChecked(), false, 'page mode button updates settings switch');
    assert.equal(await ui('.ui-language-control', 'function(){return this.getClientRects().length}'), 0);
    assert.ok(await ui('#source-language', 'function(){return this.getClientRects().length}'));
    const fullLanguageStart = requests.length;
    await ui('#source-language', 'function(){this.value="en";this.dispatchEvent(new Event("change",{bubbles:true}))}'); await done();
    assert.equal(requests.length, fullLanguageStart + 3);
    assert.ok(requests.slice(fullLanguageStart).every(request => request.body.messages[0].content.includes('Source language: English (en).')));
    await sample.screenshot({ path: path.join(screenshotDir, 'selection-full-mode.png') });
    assert.equal(await ui('#translation-mode', 'function(){return this.getAttribute("aria-label")}'), msg('switchSimpleMode'));
    const simpleStart = requests.length;
    await click('#translation-mode'); await done();
    assert.equal(requests.length, simpleStart + 1, 'Full icon switches back to first-model Simple');
    assert.equal(await ui('#source-language', 'function(){return this.value}'), 'en', 'mode changes preserve source language');
    assert.equal(await options.locator('#translation-mode').isChecked(), true);
    assert.equal(await ui('#results-list', 'function(){return this.children.length}'), 1, 'open panels react to options changes');

    const toolbar = await context.newPage();
    try {
      await toolbar.goto(`${origin}/src/popup/popup.html`);
      await toolbar.locator('#target option').first().waitFor({ state: 'attached' });
      assert.equal(await toolbar.locator('.simple-translate').count(), 0);
      assert.equal(await toolbar.locator('#translation-mode').isVisible(), false);
      assert.equal(await toolbar.locator('#translate').isVisible(), true);
    } finally { await toolbar.close(); }
    const stored = await worker.evaluate(() => chrome.storage.local.get('settings'));
    assert.deepEqual(stored.settings.models, ['simple-first', 'simple-second', 'simple-third']);
    const localeCount = requests.length;
    for (const language of ['en', 'zh-CN', 'zh-TW', 'ja', 'ko']) {
      await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage }), language);
      await until(async () => await ui('.translation-view', 'function(){return this.lang}') === language);
      assert.ok(await ui('#source-language option[value="auto"]'));
      assert.ok(await ui('#translation-mode', 'function(){return this.title}'));
      await sample.setViewportSize({ width: 320, height: 600 });
      const bounds = await ui('.selection-panel', 'function(){const r=this.getBoundingClientRect();return {left:r.left,right:r.right,overflow:this.scrollWidth>this.clientWidth}}');
      assert.ok(bounds.left >= 0 && bounds.right <= 320 && !bounds.overflow, language + JSON.stringify(bounds));
      await sample.setViewportSize({ width: 1280, height: 800 });
      if (language === 'en') await sample.screenshot({ path: path.join(screenshotDir, 'selection-simple-en.png') });
    }
    assert.equal(requests.length, localeCount, 'UI localization never retranslates');
    await worker.evaluate(async previous => {
      if (previous === undefined) await chrome.storage.local.remove('uiLanguage');
      else await chrome.storage.local.set({ uiLanguage: previous });
    }, before.uiLanguage);
    await click('#close-view');
    await select('A line of original text.\n'.repeat(40));
    await click('.selection-bubble');
    await until(async () => await ui('.result-card', 'function(){return this.dataset.state}') === 'success');
    const sourceSize = await ui('#source', 'function(){return {height:this.getBoundingClientRect().height,scroll:this.scrollHeight,client:this.clientHeight}}');
    assert.ok(sourceSize.height <= 160 && sourceSize.scroll > sourceSize.client, JSON.stringify(sourceSize));
    await sample.setViewportSize({ width: 320, height: 600 });
    const geometry = await ui('.selection-panel', 'function(){const r=this.getBoundingClientRect();return {left:r.left,right:r.right,overflow:this.scrollWidth>this.clientWidth}}');
    assert.ok(geometry.left >= 0 && geometry.right <= 320 && !geometry.overflow, JSON.stringify(geometry));
    const closeStart = requests.length;
    await ui('#source', 'function(){this.value="Do not translate after close";this.dispatchEvent(new InputEvent("input",{bubbles:true}))}');
    await click('#close-view');
    await new Promise(resolve => setTimeout(resolve, 750));
    assert.equal(requests.length, closeStart, 'closing cancels the pending debounce');
  } finally {
    setMode('success');
    await worker.evaluate(() => {
      if (globalThis.simpleSpeechTest) { Object.assign(chrome.tts, simpleSpeechTest.original); delete globalThis.simpleSpeechTest; }
    });
    await ui('#close-view', 'function(){this.click()}');
    await sample.setViewportSize({ width: 1280, height: 800 });
    await worker.evaluate(async previous => {
      await chrome.storage.local.set({ settings: previous.settings });
      for (const key of ['translationMode', 'targetLanguagePreference', 'uiLanguage']) {
        if (previous[key] === undefined) await chrome.storage.local.remove(key);
        else await chrome.storage.local.set({ [key]: previous[key] });
      }
    }, before);
    await options.close();
  }
  console.log('✓ Simple Translate: default Full, persisted switch, first model only, copy/speech, bidirectional icons, editable/debounced/IME source, toolbar spacing, automatic source/target, superseded request, retry/settings link, Full restores all models, toolbar unchanged, five locales, long source, narrow viewport');
}
