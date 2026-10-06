// Focus-independent material capture using the shipped UI's saved language preference.
// This is not a substitute for native toolbar/automatic-language regression tests.
import assert from 'node:assert/strict';
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
const locale = process.env.TEST_BROWSER_LOCALE || 'ja-JP';
const language = { 'en-US': 'en', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'ja-JP': 'ja', 'ko-KR': 'ko' }[locale];
assert.ok(language, 'supported screenshot locale');
const catalog = JSON.parse(await readFile(path.join(root, '_locales', language.replace('-', '_'), 'messages.json')));
const temp = await mkdtemp(path.join(tmpdir(), 'transight-materials-'));
const output = path.join(root, 'artifacts/screenshots', locale);
await mkdir(output, { recursive: true });
const server = http.createServer(async (req, res) => {
  if (req.url === '/sample') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<html><body><h1>Reading across borders</h1><p id="sample">A little understanding brings us closer.</p></body></html>'); return;
  }
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/v1/models') { res.end(JSON.stringify({ data: [{ id: 'mock-translator' }, { id: 'z-model' }] })); return; }
  if (req.url !== '/v1/chat/completions' || req.method !== 'POST') { res.writeHead(404); res.end('{}'); return; }
  let body = ''; for await (const chunk of req) body += chunk;
  const request = JSON.parse(body);
  res.end(JSON.stringify({ choices: [{ message: { content: fixtureReply ?? (request.model === 'z-model' ? '多一份理解，便少一分距离。' : '多一点理解，让我们更靠近。') } }] }));
});
let context;
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
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 400, height: 800 });
  await popup.goto(`${origin}/src/popup/popup.html`);
  assert.equal(await popup.locator('.version').innerText(), `v${manifest.version}`);
  await popup.locator('#source').fill('A little understanding brings us closer.');
  assert.ok((await popup.locator('#translate').innerText()).startsWith(catalog.translate.message));
  assert.equal(await popup.locator('#screenshot').count(), 0);
  await popup.locator('#translate').click();
  await popup.locator('.result-card[data-state="success"]').nth(1).waitFor();
  await popup.screenshot({ path: path.join(output, 'popup-multi.png') });
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
  await popup.screenshot({ path: path.join(output, 'popup.png') });
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
  await options.screenshot({ path: path.join(output, 'options.png'), fullPage: true });
  await options.screenshot({ path: path.join(output, 'options-multi.png'), fullPage: true });
  await options.screenshot({ path: path.join(output, 'settings-preferences.png'), fullPage: true });
  const sample = await context.newPage(); await sample.goto(`${base}/sample`);
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
  await sample.screenshot({ path: path.join(output, 'selection-trigger.png') });
  await click('.selection-bubble'); await done(2);
  assert.equal(await ui('.version'), `v${manifest.version}`);
  assert.equal(await ui('.translation-view', 'function(){return this.lang}'), language);
  await sample.screenshot({ path: path.join(output, 'selection.png') });
  await click('#pin-view');
  assert.equal(await ui('#pin-view', 'function(){return this.getAttribute("aria-pressed")}'), 'true');
  const point = await ui('.topbar', 'function(){const r=this.getBoundingClientRect();return {x:r.x+30,y:r.y+24}}');
  await sample.mouse.move(point.x, point.y); await sample.mouse.down();
  await sample.mouse.move(point.x+140, point.y+40, { steps: 8 }); await sample.mouse.up();
  const moved = await ui('.topbar', 'function(){const r=this.getBoundingClientRect();return {x:r.x+30,y:r.y+24}}');
  assert.ok(Math.abs(moved.x-point.x-140)<1 && Math.abs(moved.y-point.y-40)<1);
  await sample.screenshot({ path: path.join(output, 'selection-pinned.png') });
  // Restore the selection-anchored position before the Simple-mode capture.
  await sample.mouse.move(moved.x, moved.y); await sample.mouse.down();
  await sample.mouse.move(point.x, point.y, { steps: 8 }); await sample.mouse.up();
  await click('#pin-view');
  await click('#translation-mode'); await done(1);
  assert.equal(await ui('#translate', 'function(){return this.getBoundingClientRect().height === 0}'), true);
  await sample.screenshot({ path: path.join(output, 'selection-simple.png') });
  await click('#translation-mode'); await done(2);
  await ui('#source', `async function(){
    const canvas=document.createElement('canvas');canvas.width=420;canvas.height=220;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#edf4ef';ctx.fillRect(0,0,420,220);ctx.fillStyle='#205c4b';ctx.font='24px sans-serif';ctx.fillText('Across languages.',26,85);ctx.fillText('Closer in meaning.',26,130);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const data=new DataTransfer();for(let i=0;i<5;i++)data.items.add(new File([blob], 'sample-'+i+'.png', {type:'image/png'}));
    this.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
  }`);
  await until(async () => await ui('#source-images', 'function(){return this.querySelectorAll("img").length}') === 5);
  await sample.screenshot({ path: path.join(output, 'selection-image-strip.png') });
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
  await sample.screenshot({ path: path.join(output, 'context-multi.png') });
  await click('#close-view');
  await models(['mock-translator']);
  fixtureReply = '<img src=x onerror=alert(1)> Translation remains plain text.';
  await openContext(); await done(1);
  assert.equal(await ui('.result'), fixtureReply);
  assert.equal(await ui('.result', 'function(){return this.querySelectorAll("img").length}'), 0);
  await sample.screenshot({ path: path.join(output, 'panel.png') });
  fixtureReply = undefined;
  await click('#close-view');
  await models(['mock-translator', 'z-model']);
  await options.locator('#lock-vault').click();
  await options.locator('#vault-unlock-fields:visible').waitFor();
  await openContext();
  await until(() => !!sample.frames().find(frame => frame.url() === `${origin}/src/unlock/unlock.html`));
  const unlock = sample.frames().find(frame => frame.url() === `${origin}/src/unlock/unlock.html`);
  await unlock.locator('#unlock-password').fill('local-test-unlock-password');
  await unlock.waitForFunction(() => innerHeight < 125 && document.body.getBoundingClientRect().height <= innerHeight);
  await sample.screenshot({ path: path.join(output, 'selection-locked.png') });
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'capture-info.json'), JSON.stringify({ version: manifest.version, locale, language, method: 'isolated Chromium; saved extension language preference; local mock API', capturedAt: new Date().toISOString() }, null, 2)+'\n');
  console.log('PASS: actual localized popup/settings, Simple/Full, pasted images, context panel, masked inline unlock.');
  console.log('Screenshots:', output);
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
