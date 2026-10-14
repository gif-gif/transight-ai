// Focus-independent material capture using the shipped UI's saved language preference.
// This is not a substitute for native toolbar/automatic-language regression tests.
import assert from 'node:assert/strict';
import { articleHTML, articleText, articleTranslations } from './page-translation-screenshot-fixture.mjs';
import { mkdtemp, cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { openContextTranslation } from '../src/shared/context-menu.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json')));
let fixtureReply;
const pageRequests = [];
const locale = process.env.TEST_BROWSER_LOCALE || 'ja-JP';
const language = { 'en-US': 'en', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'ja-JP': 'ja', 'ko-KR': 'ko' }[locale];
assert.ok(language, 'supported screenshot locale');
const catalog = JSON.parse(await readFile(path.join(root, '_locales', language.replace('-', '_'), 'messages.json')));
const temp = await mkdtemp(path.join(tmpdir(), 'transight-materials-'));
const output = path.join(root, 'artifacts/screenshots', locale);
await mkdir(output, { recursive: true });
const server = http.createServer(async (req, res) => {
  if (req.url === '/article') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(articleHTML); return; }
  if (req.url === '/sample') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<html><body><h1>Reading across borders</h1><p id="sample">A little understanding brings us closer.</p></body></html>'); return;
  }
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/v1/models') { res.end(JSON.stringify({ data: [{ id: 'mock-translator' }, { id: 'z-model' }] })); return; }
  if (req.url !== '/v1/chat/completions' || req.method !== 'POST') { res.writeHead(404); res.end('{}'); return; }
  let body = ''; for await (const chunk of req) body += chunk;
  const request = JSON.parse(body);
  let blocks;
  try { blocks = JSON.parse(request.messages[1].content).blocks; } catch { /* Selection request. */ }
  if (blocks) {
    pageRequests.push(request);
    const translations = articleTranslations[language === 'en' ? 'zh-CN' : language];
    const segments = blocks.flatMap(block => block.segments.map(segment => {
      const index = articleText.indexOf(segment.text.trim());
      assert.ok(index >= 0, `Unexpected article text: ${segment.text}`);
      return { id: segment.id, text: translations[index] };
    }));
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ segments }) } }] })); return;
  }
  res.end(JSON.stringify({ choices: [{ message: { content: fixtureReply ?? (request.model === 'z-model' ? '多一份理解，便少一分距离。' : '多一点理解，让我们更靠近。') } }] }));
});
// Hide release labels only while capturing; runtime UI and layout remain unchanged.
async function capture(page, options) {
  const brands = page.locator('[data-i18n="versionBrand"]');
  const original = await brands.allTextContents();
  try {
    await brands.evaluateAll(nodes => nodes.forEach(node => {
      node.textContent = node.textContent.replace(/\s*[·•]?\s*v\d+(?:\.\d+)*\s*$/, '');
    }));
    await page.screenshot({ ...options, style: '.version { visibility: hidden !important; }' });
  } finally {
    await brands.evaluateAll((nodes, values) => nodes.forEach((node, i) => { node.textContent = values[i]; }), original);
  }
}
let context;
const cropBoxes = {};
const inputBoxes = {};
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const extension = path.join(temp, 'extension');
  await cp(path.join(root, 'dist'), extension, { recursive: true });
  context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
    executablePath: process.env.CHROMIUM_EXECUTABLE || chromium.executablePath(), channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport: { width: 1120, height: 980 }
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  assert.equal(await worker.evaluate(() => chrome.runtime.getManifest().version), manifest.version);
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const base = `http://127.0.0.1:${server.address().port}`;
  await worker.evaluate(async ({ baseUrl, language }) => chrome.storage.local.set({ uiLanguage: language, settings: {
    baseUrl, model: 'mock-translator', models: ['mock-translator', 'z-model'], targetLanguage: 'zh-CN', style: 'natural', consent: true
  } }), { baseUrl: `${base}/v1`, language });
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  let sample;
  // Closed shadow roots are not covered by screenshot styles in every browser.
  // Keep the shared capture helper and temporarily hide page-panel labels via CDP.
  async function capturePanelSafe(page, options) {
    let versionStyle;
    try {
      if (page === sample) versionStyle = await ui('.version', 'function(){const old=this.getAttribute("style");this.style.setProperty("visibility","hidden","important");return old}');
      if (page === sample) {
        const box = await ui('.translation-view', 'function(){const r=this.getBoundingClientRect();return r.width && r.height ? [Math.max(0,Math.floor(r.left)-8),Math.max(0,Math.floor(r.top)-8),Math.min(innerWidth,Math.ceil(r.right)+8),Math.min(innerHeight,Math.ceil(r.bottom)+8)] : undefined}');
        if (box) cropBoxes[path.basename(options.path)] = box;
        if (path.basename(options.path) === 'selection-image-strip.png') {
          inputBoxes['selection-image-strip.png'] = await ui('.translation-actions', 'function(){const p=this.closest(".translation-view").getBoundingClientRect(),r=this.getBoundingClientRect();return [Math.max(0,Math.floor(p.left)-8),Math.max(0,Math.floor(p.top)-8),Math.min(innerWidth,Math.ceil(p.right)+8),Math.min(innerHeight,Math.ceil(r.bottom)+8)]}');
        }
      }
      await capture(page, options);
    } finally {
      if (page === sample && versionStyle !== undefined) await ui('.version', 'function(old){if(old===null)this.removeAttribute("style");else this.setAttribute("style",old)}', [versionStyle]);
    }
  }
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 400, height: 800 });
  await popup.goto(`${origin}/src/popup/popup.html`);
  assert.equal(await popup.locator('.version').innerText(), `v${manifest.version}`);
  await popup.locator('#source').fill('A little understanding brings us closer.');
  assert.ok((await popup.locator('#translate').innerText()).startsWith(catalog.translate.message));
  assert.equal(await popup.locator('#screenshot').count(), 0);
  await popup.locator('#translate').click();
  await popup.locator('.result-card[data-state="success"]').nth(1).waitFor();
  await capturePanelSafe(popup, { path: path.join(output, 'popup-multi.png') });
  await popup.locator('#translation-mode').click();
  await popup.locator('.result-card[data-state="success"]').waitFor();
  await popup.waitForFunction(() => document.querySelector('#translate').getBoundingClientRect().height === 0);
  const simpleResult = await popup.locator('.result-card').last().boundingBox();
  assert.ok(simpleResult);
  await capturePanelSafe(popup, { path: path.join(output, 'popup-simple.png'), clip: { x: 0, y: 0, width: 400, height: Math.ceil(simpleResult.y + simpleResult.height + 16) } });
  await popup.locator('#translation-mode').click();
  await popup.locator('.result-card[data-state="success"]').nth(1).waitFor();
  async function models(values) {
    await worker.evaluate(async models => {
      const { settings } = await chrome.storage.local.get('settings');
      await chrome.storage.local.set({ settings: { ...settings, model: models[0], models } });
    }, values);
  }
  await models(['mock-translator']);
  await popup.reload();
  await popup.locator('#source').fill('A little understanding brings us closer.');
  await popup.locator('#translate').click();
  await popup.locator('.result-card[data-state="success"]').waitFor();
  await capturePanelSafe(popup, { path: path.join(output, 'popup.png') });
  await models(['mock-translator', 'z-model']);
  console.log('✓ localized popup, single/two model results and version', language, manifest.version);
  const options = await context.newPage();
  await options.goto(`${origin}/src/options/options.html`);
  await options.locator('#save:enabled').waitFor();
  await options.locator('#api-key').fill('local-test-key');
  await options.locator('#vault-password').fill('local-test-unlock-password');
  await options.locator('#vault-confirm').fill('local-test-unlock-password');
  await options.locator('#save').click();
  await options.waitForFunction(text => document.querySelector('#status').textContent === text, catalog.saved.message);
  assert.equal(await options.locator('#api-key').inputValue(), '');
  assert.ok((await options.locator('[data-i18n="versionBrand"]').innerText()).endsWith(`v${manifest.version}`));
  await capturePanelSafe(options, { path: path.join(output, 'options.png'), fullPage: true });
  await capturePanelSafe(options, { path: path.join(output, 'options-multi.png'), fullPage: true });
  await capturePanelSafe(options, { path: path.join(output, 'settings-preferences.png'), fullPage: true });
  sample = await context.newPage(); await sample.goto(`${base}/sample`);
  await sample.waitForSelector('[data-transight="selection"]', { state: 'attached' });
  const session = await context.newCDPSession(sample);
  async function ui(selector, fn = 'function(){return this.textContent}', args = []) {
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    function find(node) {
      if (node.attributes?.includes('data-transight')) return node;
      for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) { const found = find(child); if (found) return found; }
    }
    const host = find(root); assert.ok(host);
    const { object } = await session.send('DOM.resolveNode', { nodeId: host.shadowRoots[0].nodeId });
    try {
      const { result, exceptionDetails } = await session.send('Runtime.callFunctionOn', {
        objectId: object.objectId, functionDeclaration: `function(selector,...args){const element=this.querySelector(selector);if(!element)return undefined;return (${fn}).apply(element,args)}`,
        arguments: [selector, ...args].map(value => ({ value })), returnByValue: true, awaitPromise: true
      });
      if (exceptionDetails) throw Error(JSON.stringify(exceptionDetails));
      return result.value;
    } finally { await session.send('Runtime.releaseObject', { objectId: object.objectId }); }
  }
  async function until(fn) { for (let i = 0; i < 100; i++) { if (await fn()) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw Error('capture state timeout'); }
  async function click(selector) {
    const p = await ui(selector, 'function(){const r=this.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}');
    assert.ok(p, selector); await sample.mouse.click(p.x, p.y);
  }
  const done = count => until(async () => await ui('#results-list', 'function(){return this.querySelectorAll(".result-card[data-state=success]").length}') === count);
  await sample.evaluate(() => {
    const p = document.querySelector('#sample'), range = document.createRange(); range.selectNodeContents(p);
    getSelection().removeAllRanges(); getSelection().addRange(range);
    p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await until(async () => await ui('.selection-bubble', 'function(){return !this.hidden}'));
  await capturePanelSafe(sample, { path: path.join(output, 'selection-trigger.png') });
  await click('.selection-bubble'); await done(2);
  assert.equal(await ui('.version'), `v${manifest.version}`);
  assert.equal(await ui('.translation-view', 'function(){return this.lang}'), language);
  await capturePanelSafe(sample, { path: path.join(output, 'selection.png') });
  const googleClip = await ui('.translation-actions', 'function(){const r=this.getBoundingClientRect(),p=this.closest(".translation-view").getBoundingClientRect();return {x:Math.max(0,p.x-8),y:Math.max(0,p.y-8),width:Math.min(innerWidth-p.x+8,p.width+16),height:r.bottom-p.y+16}}');
  assert.equal(await ui('#translate-google', 'function(){return this.getBoundingClientRect().width > 0}'), true);
  assert.equal(await ui('#translate-website', 'function(){return this.getBoundingClientRect().width > 0}'), true);
  await capturePanelSafe(sample, { path: path.join(output, 'external-translation.png'), clip: googleClip });
  await click('#pin-view');
  assert.equal(await ui('#pin-view', 'function(){return this.getAttribute("aria-pressed")}'), 'true');
  const point = await ui('.topbar', 'function(){const r=this.getBoundingClientRect();return {x:r.x+30,y:r.y+24}}');
  await sample.mouse.move(point.x, point.y); await sample.mouse.down();
  await sample.mouse.move(point.x+140, point.y+40, { steps: 8 }); await sample.mouse.up();
  const moved = await ui('.topbar', 'function(){const r=this.getBoundingClientRect();return {x:r.x+30,y:r.y+24}}');
  assert.ok(Math.abs(moved.x-point.x-140)<1 && Math.abs(moved.y-point.y-40)<1);
  await capturePanelSafe(sample, { path: path.join(output, 'selection-pinned.png') });
  // Restore the selection-anchored position before the Simple-mode capture.
  await sample.mouse.move(moved.x, moved.y); await sample.mouse.down();
  await sample.mouse.move(point.x, point.y, { steps: 8 }); await sample.mouse.up();
  await click('#pin-view');
  await click('#translation-mode'); await done(1);
  assert.equal(await ui('#translate', 'function(){return this.getBoundingClientRect().height === 0}'), true);
  await capturePanelSafe(sample, { path: path.join(output, 'selection-simple.png') });
  await click('#translation-mode'); await done(2);
  await ui('#source', `async function(){
    const canvas=document.createElement('canvas');canvas.width=420;canvas.height=220;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#edf4ef';ctx.fillRect(0,0,420,220);ctx.fillStyle='#205c4b';ctx.font='24px sans-serif';ctx.fillText('Across languages.',26,85);ctx.fillText('Closer in meaning.',26,130);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const data=new DataTransfer();for(let i=0;i<5;i++)data.items.add(new File([blob], 'sample-'+i+'.png', {type:'image/png'}));
    this.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
  }`);
  await until(async () => await ui('#source-images', 'function(){return this.querySelectorAll("img").length}') === 5);
  await capturePanelSafe(sample, { path: path.join(output, 'selection-image-strip.png') });
  await click('#close-view');
  // Reload to discard pasted draft images before capturing the context-menu panel.
  await sample.reload(); await sample.waitForSelector('[data-transight="selection"]', { state: 'attached' });
  const tabId = await worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, `${base}/sample`);
  async function openContext() {
    await worker.evaluate(async ({ tabId, handler }) => {
      const open = (0, eval)(`(${handler})`);
      await open({ menuItemId: 'yijian-translate', selectionText: 'A little understanding brings us closer.', frameId: 0 }, { id: tabId });
    }, { tabId, handler: openContextTranslation.toString() });
  }
  await openContext(); await done(2);
  await capturePanelSafe(sample, { path: path.join(output, 'context-multi.png') });
  await click('#close-view');
  await models(['mock-translator']);
  fixtureReply = '<img src=x onerror=alert(1)> Translation remains plain text.';
  await openContext(); await done(1);
  assert.equal(await ui('.result'), fixtureReply);
  assert.equal(await ui('.result', 'function(){return this.querySelectorAll("img").length}'), 0);
  await capturePanelSafe(sample, { path: path.join(output, 'panel.png') });
  fixtureReply = undefined;
  await click('#close-view');
  await models(['mock-translator', 'z-model']);
  // Capture the real page-translation confirmation and result UI with local fixtures.
  const article = await context.newPage();
  await article.setViewportSize({ width: 1280, height: 850 });
  await article.goto(`${base}/article`);
  const articleTabId = await worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, `${base}/article`);
  const opened = await popup.evaluate(({ tabId, targetLanguage }) => chrome.runtime.sendMessage({ type: 'AI_PAGE_OPEN', tabId, targetLanguage }), { tabId: articleTabId, targetLanguage: language === 'en' ? 'zh-CN' : language });
  assert.equal(opened.ok, true, JSON.stringify(opened));
  const pageBar = async id => (await worker.evaluate(({ tabId, id }) => chrome.scripting.executeScript({ target: { tabId }, func: id => {
    const host = document.querySelector('[data-transight="page"]');
    if (!host) return null;
    const el = chrome.dom.openOrClosedShadowRoot(host).getElementById(id);
    const rect = el.getBoundingClientRect();
    return { text: el.textContent, hidden: el.hidden, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, args: [id] }), { tabId: articleTabId, id }))[0].result;
  await until(async () => !!await pageBar('start'));
  assert.equal(pageRequests.length, 0, 'Opening confirmation must not upload page text');
  await capture(article, { path: path.join(output, 'ai-page-confirm.png') });
  const start = await pageBar('start'); await article.mouse.click(start.x, start.y);
  const expected = articleTranslations[language === 'en' ? 'zh-CN' : language];
  await until(async () => await article.locator('h1').textContent() === expected[0] && (await pageBar('progress')).text.includes(catalog.pageWatching.message));
  assert.ok(pageRequests.length > 0);
  assert.ok(pageRequests.every(request => request.model === 'mock-translator'));
  assert.equal(await article.locator('a').getAttribute('href'), '#guide');
  await capture(article, { path: path.join(output, 'ai-page-result.png') });
  const restore = await pageBar('restore'); await article.mouse.click(restore.x, restore.y);
  await until(async () => await article.locator('h1').textContent() === articleText[0]);
  await article.close();
  await options.locator('#lock-vault').click();
  await options.locator('#vault-unlock-fields:visible').waitFor();
  await openContext();
  await until(() => !!sample.frames().find(frame => frame.url() === `${origin}/src/unlock/unlock.html`));
  const unlock = sample.frames().find(frame => frame.url() === `${origin}/src/unlock/unlock.html`);
  await unlock.locator('#unlock-password').fill('local-test-unlock-password');
  await unlock.waitForFunction(() => innerHeight < 125 && document.body.getBoundingClientRect().height <= innerHeight);
  await capturePanelSafe(sample, { path: path.join(output, 'selection-locked.png') });
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'capture-info.json'), JSON.stringify({ version: manifest.version, versionWatermarks: 'hidden', locale, language, cropBoxes, inputBoxes, features: ['ai-page-translation'], method: 'isolated Chromium; saved extension language preference; local mock API', capturedAt: new Date().toISOString() }, null, 2)+'\n');
  console.log('PASS: actual localized popup/settings, Simple/Full, pasted images, context panel, masked inline unlock.');
  console.log('Screenshots:', output);
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
