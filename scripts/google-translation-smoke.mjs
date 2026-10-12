// Isolated extension test. All tabs.create calls are intercepted: no text leaves
// the machine and no Google request is made by this test.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(path.join(tmpdir(), 'transight-google-'));
const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<p id="sample">Read across languages.</p>'); });
let context;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const extension = path.join(temp, 'extension'); await cp(path.join(root, 'dist'), extension, { recursive: true });
  context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
    executablePath: process.env.CHROMIUM_EXECUTABLE || chromium.executablePath(), channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport: { width: 400, height: 780 }
  });
  const errors = []; context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  await worker.evaluate(() => {
    globalThis.googleTest = { created: [] };
    chrome.tabs.create = async options => { googleTest.created.push(options); return { id: 999 }; };
    return chrome.storage.local.set({ uiLanguage: 'en' });
  });
  const popup = await context.newPage();
  await popup.addInitScript(() => {
    window.googleTest = { created: [], fail: false };
    chrome.tabs.create = async options => {
      if (googleTest.fail) throw Error('test failed');
      googleTest.created.push(options); return { id: 999 };
    };
  });
  await popup.goto(`${origin}/src/popup/popup.html`);
  await popup.locator('#translate-google:visible').waitFor();
  assert.equal(await popup.locator('#setup').isVisible(), true);
  assert.equal(await popup.locator('.translation-actions #translate-google').count(), 1, 'Full Google entry is next to AI Translate');
  assert.equal(await popup.locator('.text-card + .translation-actions #translate').isVisible(), true, 'Full AI button restored directly below source');
  assert.equal(await popup.evaluate(() => googleTest.created.length), 0);
  await popup.locator('#translate-google').click();
  await popup.waitForFunction(() => document.querySelector('#google-translation-status').dataset.i18n === 'googleTextRequired');
  await popup.locator('#source').fill('a'.repeat(5001));
  await popup.locator('#translate-google').click();
  await popup.waitForFunction(() => document.querySelector('#google-translation-status').dataset.i18n === 'googleTextTooLong');
  assert.equal(await popup.evaluate(() => googleTest.created.length), 0);
  const text = 'Hello & tl=ru\n你好 + % # 😀';
  for (const translationMode of ['full', 'simple']) {
    await worker.evaluate(translationMode => chrome.storage.local.set({ translationMode }), translationMode);
    await popup.waitForFunction(simple => document.querySelector('.translation-view').classList.contains('simple-translate') === simple, translationMode === 'simple');
    await popup.locator('#source').fill(text);
    await popup.locator('#source-language').selectOption('en');
    for (const target of ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt']) {
      await popup.locator('#target').selectOption(target);
      const count = await popup.evaluate(() => googleTest.created.length);
      await popup.locator('#translate-google').click();
      await popup.waitForFunction(count => googleTest.created.length === count + 1, count);
      const url = new URL(await popup.evaluate(() => googleTest.created.at(-1).url));
      assert.equal(url.origin, 'https://translate.google.com');
      assert.equal(url.searchParams.get('text'), text);
      assert.equal(url.searchParams.get('tl'), target);
      assert.equal(url.searchParams.get('sl'), 'en');
    }
  }
  await popup.evaluate(() => { googleTest.fail = true; });
  await popup.locator('#translate-google').click();
  await popup.waitForFunction(() => document.querySelector('#google-translation-status').dataset.i18n === 'googleTranslationFailed');
  assert.equal(await popup.locator('#translate-google').isEnabled(), true);
  await popup.evaluate(() => { googleTest.fail = false; });
  await popup.locator('#translate-google').click();
  await popup.locator('#google-translation-status').waitFor({ state: 'hidden' });
  const options = await context.newPage(); await options.goto(`${origin}/src/options/options.html`);
  await options.locator('#save:enabled').waitFor();
  assert.equal(await options.locator('#google-translation-enabled').isChecked(), true);
  await options.locator('#google-translation-enabled').uncheck();
  await popup.locator('#translate-google').waitFor({ state: 'hidden' });
  assert.equal(await popup.locator('#translate-website').isVisible(), true, 'independent whole-page entry remains available');
  await options.reload(); await options.locator('#save:enabled').waitFor();
  assert.equal(await options.locator('#google-translation-enabled').isChecked(), false);
  await popup.reload(); await popup.locator('#target option').first().waitFor({ state: 'attached' });
  assert.equal(await popup.locator('#translate-google').isVisible(), false);
  await options.locator('#google-translation-enabled').check();
  await popup.locator('#translate-google:visible').waitFor();
  const output = path.join(root, 'artifacts/google-translation'); await mkdir(output, { recursive: true });
  for (const translationMode of ['full', 'simple']) {
    await worker.evaluate(translationMode => chrome.storage.local.set({ translationMode }), translationMode);
    await popup.waitForFunction(simple => document.querySelector('.translation-view').classList.contains('simple-translate') === simple, translationMode === 'simple');
    for (const language of ['en', 'zh-CN', 'zh-TW', 'ja', 'ko']) {
      await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage }), language);
      await popup.waitForFunction(language => document.documentElement.lang === language, language);
      assert.ok(await popup.locator('#translate-google').getAttribute('title'));
      assert.ok(await popup.locator('#translate-google').getAttribute('aria-label'));
      assert.equal(await popup.locator('#translate').isVisible(), translationMode === 'full');
      const group = translationMode === 'full' ? '.translation-actions' : '#simple-external-actions';
      assert.equal(await popup.locator(`${group} #translate-google`).isVisible(), true);
      assert.equal(await popup.locator(`${group} #translate-website`).isVisible(), true);
      assert.equal(await popup.evaluate(() => {
        const page = document.querySelector('#translate-website').getBoundingClientRect();
        const text = document.querySelector('#translate-google').getBoundingClientRect();
        return Math.abs(page.top - text.top) < 1 && page.right <= text.left;
      }), true, 'Google actions stay together on one row');

      assert.equal(await popup.evaluate(() => {
        const brand = document.querySelector('.topbar .brand').getBoundingClientRect();
        const actions = document.querySelector('.header-actions').getBoundingClientRect();
        return brand.right <= actions.left && actions.right <= innerWidth;
      }), true, 'header controls do not overlap the brand');
      assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#translate-google').scrollWidth <= document.querySelector('#translate-google').clientWidth), true);
      await popup.screenshot({ path: path.join(output, `${translationMode}-${language}.png`), fullPage: true });
    }
  }
  // Exercise the real content-script -> background path in the closed shadow UI.
  const sample = await context.newPage(); await sample.setViewportSize({ width: 1100, height: 800 });
  const sampleUrl = `http://127.0.0.1:${server.address().port}/sample`;
  await sample.goto(sampleUrl); await sample.waitForSelector('[data-transight="selection"]', { state: 'attached' });
  const tabId = await worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, sampleUrl);
  assert.equal((await worker.evaluate(tabId => chrome.tabs.sendMessage(tabId, { type: 'SELECTION_OPEN', text: 'Selected free translation text.' }), tabId)).ok, true);
  const session = await context.newCDPSession(sample);
  async function ui(selector, fn = 'function(){return !this.hidden}') {
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    function find(node) {
      if (node.attributes?.includes('data-transight')) return node;
      for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) { const found = find(child); if (found) return found; }
    }
    const host = find(root); assert.ok(host);
    const { object } = await session.send('DOM.resolveNode', { nodeId: host.shadowRoots[0].nodeId });
    try {
      const { result, exceptionDetails } = await session.send('Runtime.callFunctionOn', {
        objectId: object.objectId, functionDeclaration: `function(selector){const e=this.querySelector(selector);return e && (${fn}).call(e)}`,
        arguments: [{ value: selector }], returnByValue: true, awaitPromise: true
      });
      if (exceptionDetails) throw Error(JSON.stringify(exceptionDetails));
      return result.value;
    } finally { await session.send('Runtime.releaseObject', { objectId: object.objectId }); }
  }
  async function until(fn) { for (let i = 0; i < 100; i++) { if (await fn()) return; await sample.waitForTimeout(50); } throw Error('panel assertion timed out'); }
  await until(() => ui('#google-translation'));
  assert.equal(await worker.evaluate(() => googleTest.created.length), 0, 'opening a selection never sends to Google automatically');
  for (const translationMode of ['full', 'simple']) {
    await worker.evaluate(translationMode => chrome.storage.local.set({ translationMode }), translationMode);
    await until(async () => (await ui('.translation-view', 'function(){return this.classList.contains("simple-translate")}')) === (translationMode === 'simple'));
    assert.equal(await ui(translationMode === 'simple' ? '#simple-external-actions #translate-website' : '.translation-actions #translate-website'), true);
    await worker.evaluate(() => chrome.storage.local.set({ targetLanguagePreference: 'ja' }));
    await until(async () => (await ui('#target', 'function(){return this.value}')) === 'ja');
    const count = await worker.evaluate(() => googleTest.created.length);
    const point = await ui('#translate-google', 'function(){this.scrollIntoView({block:"center"});const r=this.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}');
    await sample.mouse.click(point.x, point.y);
    await until(async () => (await worker.evaluate(() => googleTest.created.length)) === count + 1);
    const url = new URL(await worker.evaluate(() => googleTest.created.at(-1).url));
    assert.equal(url.searchParams.get('text'), 'Selected free translation text.');
    assert.equal(url.searchParams.get('tl'), 'ja');
    const pagePoint = await ui('#translate-website', 'function(){const r=this.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}');
    await sample.mouse.click(pagePoint.x, pagePoint.y);
    await until(async () => (await worker.evaluate(() => googleTest.created.length)) === count + 2);
    const pageUrl = new URL(await worker.evaluate(() => googleTest.created.at(-1).url));
    assert.equal(pageUrl.searchParams.get('u'), sampleUrl);
    assert.equal(pageUrl.searchParams.get('tl'), 'ja');

  }
  await options.locator('#google-translation-enabled').uncheck();
  await until(async () => !(await ui('#google-translation')));
  await popup.locator('#translate-google').waitFor({ state: 'hidden' });
  await options.locator('#google-translation-enabled').check();
  await until(() => ui('#google-translation'));
  await worker.evaluate(() => chrome.storage.local.set({ uiLanguage: 'zh-CN' }));
  await options.waitForFunction(() => document.documentElement.lang === 'zh-CN');
  await sample.screenshot({ path: path.join(output, 'selection.png') });
  await options.locator('#google-translation-enabled').scrollIntoViewIfNeeded();
  await options.screenshot({ path: path.join(output, 'settings.png') });
  assert.deepEqual(errors, []);
  console.log('PASS: Google text URL, 10 targets x 2 modes, input errors/retry, no API configuration, opt-out persistence/live sync, five locales, real selection panel and background path; no external requests.');
} finally {
  await context?.close(); await new Promise(resolve => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
