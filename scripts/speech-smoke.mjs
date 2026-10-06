import assert from 'node:assert/strict';
import path from 'node:path';

// Use the real extension ports and view, replacing only the OS speech engine.
// No external service, credentials, speaker output or production test hooks.
export async function speechSmoke({ context, worker, page, sample, tabId, screenshotDir, msg, setMode, modelBehaviors }) {
  setMode('success'); modelBehaviors.clear();
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const previous = await worker.evaluate(async () => chrome.storage.local.get(['settings', 'targetLanguagePreference']));
  const session = await context.newCDPSession(sample);
  let other;
  async function until(fn, label = 'speech state') {
    for (let i = 0; i < 100; i++) { if (await fn()) return; await page.waitForTimeout(50); }
    throw Error(`${label}: timed out`);
  }
  async function ui(fn, args = []) {
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    function find(node) {
      if (node.attributes?.includes('data-transight')) return node;
      for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) { const match = find(child); if (match) return match; }
    }
    const host = find(root); assert.ok(host);
    const { object } = await session.send('DOM.resolveNode', { nodeId: host.shadowRoots[0].nodeId });
    try {
      const { result, exceptionDetails } = await session.send('Runtime.callFunctionOn', {
        objectId: object.objectId, functionDeclaration: fn, arguments: args.map(value => ({ value })), returnByValue: true
      });
      if (exceptionDetails) throw Error(JSON.stringify(exceptionDetails));
      return result.value;
    } finally { await session.send('Runtime.releaseObject', { objectId: object.objectId }); }
  }
  async function clickPanel(selector) {
    const point = await ui('function(selector){const e=this.querySelector(selector);e.scrollIntoView({block:"nearest"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}', [selector]);
    await sample.mouse.click(point.x, point.y);
  }
  const count = () => worker.evaluate(() => globalThis.speechTest.calls.length);
  const stops = () => worker.evaluate(() => globalThis.speechTest.stops);
  const finish = () => worker.evaluate(() => globalThis.speechTest.calls.at(-1).options.onEvent({ type: 'end' }));
  try {
    const nativeCheck = await worker.evaluate(async () => {
      const real = await new Promise(resolve => chrome.tts.getVoices(resolve));
      const local = real.filter(v => v.remote === false && v.eventTypes?.includes('end'));
      const nativeVoice = local.find(v => v.lang?.startsWith('zh'));
      let nativeResult = 'No local Chinese voice; native audio test skipped';
      if (nativeVoice) {
        nativeResult = await new Promise(resolve => {
          const timer = setTimeout(() => { chrome.tts.stop(); resolve('timeout'); }, 15000);
          const finish = value => { clearTimeout(timer); resolve(value); };
          chrome.tts.speak('翻译。', {
            voiceName: nativeVoice.voiceName, lang: nativeVoice.lang,
            ...(nativeVoice.extensionId ? { extensionId: nativeVoice.extensionId } : {}), volume: 0,
            requiredEventTypes: ['end'], onEvent: event => {
              if (['end', 'error', 'cancelled', 'interrupted'].includes(event.type)) finish(event.type);
            }
          }, () => { if (chrome.runtime.lastError) finish('error'); });
        });
      }
      globalThis.speechTest = { original: { getVoices: chrome.tts.getVoices, speak: chrome.tts.speak, stop: chrome.tts.stop }, calls: [], stops: 0, remoteOnly: false };
      chrome.tts.getVoices = callback => callback(['zh-CN', 'en-US', 'ja-JP', 'ko-KR'].map(lang => ({
        voiceName: `Test ${lang}`, lang, remote: globalThis.speechTest.remoteOnly, eventTypes: ['start', 'end', 'error']
      })));
      chrome.tts.speak = (text, options, callback) => { globalThis.speechTest.calls.push({ text, options }); callback?.(); options.onEvent({ type: 'start' }); };
      chrome.tts.stop = () => globalThis.speechTest.stops++;
      const { settings } = await chrome.storage.local.get('settings');
      await chrome.storage.local.set({ settings: { ...settings, model: 'mock-translator', models: ['mock-translator', 'z-model'] }, targetLanguagePreference: 'zh-CN' });
      return { voiceCount: local.length, nativeResult };
    });
    console.log('Native TTS (silent test):', nativeCheck);
    if (nativeCheck.voiceCount && !nativeCheck.nativeResult.startsWith('No local')) assert.equal(nativeCheck.nativeResult, 'end');
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto(`${origin}/src/popup/popup.html`);
    await page.locator('.result-card').nth(1).waitFor();
    const first = page.locator('.speak-result').nth(0), second = page.locator('.speak-result').nth(1);
    assert.equal(await first.isDisabled(), true);
    await page.locator('#source').fill('Speech test');
    let release;
    modelBehaviors.set('z-model', { wait: new Promise(resolve => { release = resolve; }) });
    await page.locator('#translate').click();
    await page.locator('.result-card[data-state="success"]').waitFor();
    assert.equal(await second.isDisabled(), true);
    assert.equal(await count(), 0, 'no autoplay');
    assert.equal(await first.getAttribute('title'), msg('readTranslation'));
    await first.click(); await until(async () => await count() === 1);
    assert.equal(await first.getAttribute('aria-pressed'), 'true');
    assert.equal(await first.getAttribute('title'), msg('stopSpeech'));
    assert.equal(await worker.evaluate(() => globalThis.speechTest.calls[0].options.lang), 'zh-CN');
    assert.equal(await worker.evaluate(() => globalThis.speechTest.calls[0].text), '多一点理解，让我们更靠近。');
    release(); modelBehaviors.clear(); await page.locator('.result-card[data-state="success"]').nth(1).waitFor();
    await second.click(); await until(async () => await count() === 2);
    assert.equal(await stops(), 1); assert.equal(await first.getAttribute('aria-pressed'), 'false');
    await second.click(); await until(async () => await stops() === 2);
    await first.click(); await until(async () => await count() === 3); await finish();
    await until(async () => await first.getAttribute('aria-pressed') === 'false');
    await worker.evaluate(() => { globalThis.speechTest.remoteOnly = true; });
    await first.click(); await page.waitForFunction(message => document.querySelector('#status').textContent === message, msg('speechNoLocalVoice'));
    assert.equal(await count(), 3); assert.equal(await first.getAttribute('aria-pressed'), 'false');
    await worker.evaluate(() => { globalThis.speechTest.remoteOnly = false; });
    await first.click(); await until(async () => await count() === 4);
    await worker.evaluate(() => globalThis.speechTest.calls.at(-1).options.onEvent({ type: 'error' }));
    await page.waitForFunction(message => document.querySelector('#status').textContent === message, msg('speechFailed'));
    await first.click(); await until(async () => await count() === 5);
    await page.screenshot({ path: path.join(screenshotDir, 'speech-popup.png') });

    // Different extension page takes over; closing the old owner must not stop it.
    other = await context.newPage(); await other.goto(`${origin}/src/popup/popup.html`);
    await other.locator('#source').fill('Other window'); await other.locator('#translate').click();
    await other.locator('.result-card[data-state="success"]').nth(1).waitFor();
    await other.locator('.speak-result').first().click(); await until(async () => await count() === 6);
    await until(async () => await first.getAttribute('aria-pressed') === 'false');
    let stopCount = await stops(); await page.reload(); await page.locator('#source').waitFor();
    assert.equal(await stops(), stopCount);
    await other.close(); other = null; await until(async () => await stops() === stopCount + 1, 'closed owner stops');

    // Shared floating/context panel uses the same controls and port lifecycle.
    await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'SELECTION_OPEN', text: 'Read this selection' }), tabId);
    await until(() => ui('function(){return this.querySelectorAll(".result-card[data-state=success]").length===2}'));
    await clickPanel('.speak-result'); await until(async () => await count() === 7);
    assert.equal(await ui('function(){return this.querySelector(".speak-result").getAttribute("aria-pressed")}'), 'true');
    await clickPanel('#pin-view'); // Fixed panels and copying must not interrupt speech.
    stopCount = await stops(); await clickPanel('.copy-result'); assert.equal(await stops(), stopCount);
    await sample.screenshot({ path: path.join(screenshotDir, 'speech-selection.png') });
    await clickPanel('#close-view'); await until(async () => await stops() === stopCount + 1);
    await worker.evaluate(async tabId => chrome.tabs.sendMessage(tabId, { type: 'SELECTION_OPEN', text: 'Read again' }), tabId);
    await until(() => ui('function(){return this.querySelectorAll(".result-card[data-state=success]").length===2}'));
    await clickPanel('.speak-result'); await until(async () => await count() === 8);
    stopCount = await stops(); await sample.reload(); await until(async () => await stops() === stopCount + 1, 'navigation stops');

    // A non-Chinese target still uses the fixed local Chinese voice.
    await page.locator('#source').fill('French'); await page.locator('#target').selectOption('fr');
    await page.locator('#translate').click(); await page.locator('.result-card[data-state="success"]').nth(1).waitFor();
    await first.click(); await until(async () => await count() === 9);
    assert.equal(await worker.evaluate(() => globalThis.speechTest.calls.at(-1).options.lang), 'zh-CN');
    assert.equal(await page.locator('.copy-result').first().isEnabled(), true);
    await first.click();
    console.log('✓ Speech: disabled/ready/loading models, manual play/stop/end/error, local-only Chinese voice across target languages, cross-window exclusion, stale close, panel pin/copy/close/navigation');
  } finally {
    await other?.close();
    await worker.evaluate(async previous => {
      const test = globalThis.speechTest;
      if (test) { Object.assign(chrome.tts, test.original); delete globalThis.speechTest; }
      await chrome.storage.local.set(previous);
      if (!('targetLanguagePreference' in previous)) await chrome.storage.local.remove('targetLanguagePreference');
    }, previous);
    modelBehaviors.clear(); await session.detach();
  }
}
