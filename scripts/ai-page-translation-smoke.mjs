// Uses only a local fixture + local deterministic model. No browsing content or
// credentials are sent to external services. Run after npm run build.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const requests = []; let delay = 0, invalid = false;
const html = `<!doctype html><meta charset="utf-8"><title>Local article</title><style>body{font:18px/1.6 system-ui;max-width:750px;margin:50px auto;background:#f7f5f0}a{color:#26745e}.hidden{display:none}</style><h1>Languages bring people closer</h1><p id="inline">Read <a href="#guide" id="link">the guide</a> before continuing.</p><p id="change">This text can change.</p><button id="action">Press this button</button><input value="Private form value"><div contenteditable>Private editor content</div><pre>SECRET_CODE</pre><p hidden>HIDDEN_SECRET</p><p translate="no">DO_NOT_TRANSLATE</p><div id="dynamic"></div><p id="reveal" class="hidden">Newly visible content</p><script>window.clicks=0;document.querySelector('#action').addEventListener('click',()=>window.clicks++);window.originalLink=document.querySelector('#link');</script>`;
const server = createServer(async (req, res) => {
  if (req.url === '/v1/chat/completions') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    let blocks;
    try { blocks = JSON.parse(body.messages[1].content).blocks; } catch { /* Ordinary selection request. */ }
    if (!blocks) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { content: '模拟划词译文' } }] })); return; }
    requests.push(body);
    const segments = blocks.flatMap(block => block.segments.map(segment => ({ id: segment.id, text: `译文 ${segment.text.trim()}` })));
    const bad = invalid;
    await new Promise(resolve => setTimeout(resolve, delay));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: bad ? '{}' : JSON.stringify({ segments }) } }] }));
  } else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const temp = await mkdtemp(path.join(tmpdir(), 'transight-ai-page-'));
let context;
const waitUntil = async fn => { for (let i = 0; i < 120; i++) { if (await fn()) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error('Timed out waiting for condition'); };
try {
  context = await chromium.launchPersistentContext(path.join(temp, 'profile'), { executablePath: process.env.CHROMIUM_EXECUTABLE || chromium.executablePath(), channel: 'chromium', headless: true, args: [`--disable-extensions-except=${path.join(root, 'dist')}`, `--load-extension=${path.join(root, 'dist')}`], viewport: { width: 1280, height: 800 } });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  await worker.evaluate(async base => { await chrome.storage.local.set({ uiLanguage: 'zh-CN', settings: { baseUrl: base + '/v1', models: ['first-model', 'second-model'], model: 'first-model', consent: true, style: 'natural', targetLanguage: 'zh-CN' } }); }, base);
  const page = await context.newPage(); await page.goto(base + '/article');
  const tabId = await worker.evaluate(async base => (await chrome.tabs.query({})).find(tab => tab.url === base + '/article').id, base);
  let popup = await context.newPage(); await popup.goto(origin + '/src/popup/popup.html');
  const open = async (targetLanguage = 'zh-CN') => {
    const result = await popup.evaluate(({ tabId, targetLanguage }) => chrome.runtime.sendMessage({ type: 'AI_PAGE_OPEN', tabId, targetLanguage }), { tabId, targetLanguage });
    assert.equal(result.ok, true, JSON.stringify(result));
  };
  const bar = async (id, click = false) => (await worker.evaluate(({ tabId, id, click }) => chrome.scripting.executeScript({ target: { tabId }, func: (id, click) => {
    const host = document.querySelector('[data-transight="page"]'); if (!host) return null;
    const root = chrome.dom.openOrClosedShadowRoot(host), el = root.getElementById(id);
    if (click) el.click();
    return { text: el.textContent, hidden: el.hidden, width: el.getBoundingClientRect().width };
  }, args: [id, click] }), { tabId, id, click }))[0].result;
  // Simulate a leftover injection guard with no live message receiver (reload).
  await worker.evaluate(tabId => chrome.scripting.executeScript({ target: { tabId }, func: () => {
    globalThis.__transightPageTranslation = true;
  } }), tabId);
  // Exercise the popup button handler and active-tab lookup, not just direct RPC.
  await popup.locator('#translate-ai-page').waitFor({ state: 'visible' });
  await page.bringToFront();
  await worker.evaluate(tabId => chrome.tabs.update(tabId, { active: true }), tabId);
  await popup.evaluate(() => document.querySelector('#translate-ai-page').click());
  await waitUntil(async () => Boolean(await bar('start'))).catch(async error => { console.log('Button error:', await popup.locator('#website-translation-status').textContent().catch(() => 'popup closed')); throw error; });
  await bar('close', true);
  if (popup.isClosed()) { popup = await context.newPage(); await popup.goto(origin + '/src/popup/popup.html'); }
  await open();
  // A disposed/disconnected controller can be reinstalled; a live one is reused.
  await worker.evaluate(tabId => chrome.scripting.executeScript({ target: { tabId }, func: () => {
    globalThis.__transightPageTranslation.dispose();
  } }), tabId);
  await open();
  assert.equal(requests.length, 0, 'no text before explicit consent');
  await bar('start', true);
  await page.waitForFunction(() => document.querySelector('h1').textContent.startsWith('译文'));
  await waitUntil(async () => (await bar('progress')).text.includes('等待新内容'));
  assert.ok(requests.length > 0);
  assert.match((await bar('progress')).text, /\d+ \/ \d+/);
  assert.ok(requests.every(request => request.model === 'first-model'));
  const sent = JSON.stringify(requests.map(request => request.messages[1]));
  for (const excluded of ['Private form', 'Private editor', 'SECRET_CODE', 'HIDDEN_SECRET', 'DO_NOT_TRANSLATE', '/article']) assert.equal(sent.includes(excluded), false, excluded);
  assert.equal(await page.evaluate(() => document.querySelector('#link') === window.originalLink), true);
  await page.locator('#action').click(); assert.equal(await page.evaluate(() => window.clicks), 1);
  assert.equal(await page.locator('input').inputValue(), 'Private form value');
  const beforeToggle = requests.length;
  await bar('toggle', true); assert.equal(await page.locator('h1').textContent(), 'Languages bring people closer');
  await bar('toggle', true); assert.match(await page.locator('h1').textContent(), /^译文/);
  assert.equal(requests.length, beforeToggle, 'toggle uses page memory');
  await page.evaluate(() => { const p = document.createElement('p'); p.textContent = 'A dynamically loaded paragraph'; p.id = 'added'; document.querySelector('#dynamic').append(p); document.querySelector('#reveal').className = ''; });
  await page.waitForFunction(() => document.querySelector('#added').textContent.startsWith('译文') && document.querySelector('#reveal').textContent.startsWith('译文'));
  // Own writes never become a new source.
  await new Promise(resolve => setTimeout(resolve, 1200));
  assert.ok(requests.every(request => !request.messages[1].content.includes('译文')));
  await page.screenshot({ path: '/tmp/transight-ai-page-preview.png' });
  await bar('stop', true);
  await page.evaluate(() => { document.querySelector('#change').firstChild.data = 'Site updated this after translation'; });
  await bar('restore', true);
  assert.equal(await page.locator('#inline').textContent(), 'Read the guide before continuing.');
  assert.equal(await page.locator('#change').textContent(), 'Site updated this after translation');
  // Cancellation and navigation fence late responses.
  delay = 900; const beforeCancel = requests.length; await bar('start', true);
  await waitUntil(() => requests.length > beforeCancel);
  await bar('stop', true); await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal(await page.locator('h1').textContent(), 'Languages bring people closer');
  const beforeNavigate = requests.length; await bar('start', true);
  await waitUntil(() => requests.length > beforeNavigate);
  await page.evaluate(() => history.pushState({}, '', '/next-article'));
  await waitUntil(async () => (await bar('error')).text.includes('网页地址已改变'));
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal(await page.locator('h1').textContent(), 'Languages bring people closer');
  await bar('close', true); delay = 0;
  await open('ja'); assert.equal((await bar('start')).hidden, false, 'closing/reopening restores initial controls');
  invalid = true; await bar('start', true);
  await waitUntil(async () => (await bar('error')).text.includes('模型返回的结构不正确'));
  assert.equal(await page.locator('h1').textContent(), 'Languages bring people closer');
  await bar('stop', true); invalid = false; await bar('start', true);
  await page.waitForFunction(() => document.querySelector('h1').textContent.startsWith('译文'));
  assert.match(requests.at(-1).messages[0].content, /日本語/);
  await bar('restore', true);
  // Reusing the trusted unlock frame never exposes a key to page content.
  const options = await context.newPage(); await options.goto(origin + '/src/options/options.html');
  const saved = await options.evaluate(async base => {
    const settings = (await chrome.storage.local.get('settings')).settings;
    const result = await chrome.runtime.sendMessage({ type: 'VAULT_SAVE', settings: { ...settings, baseUrl: base + '/v1', apiKey: 'local-mock-secret' }, password: 'test-password', confirmation: 'test-password' });
    await chrome.runtime.sendMessage({ type: 'VAULT_LOCK' }); return result;
  }, base);
  assert.equal(saved.ok, true, JSON.stringify(saved));
  await bar('start', true);
  await waitUntil(async () => !(await bar('unlock')).hidden);
  await waitUntil(() => page.frames().some(frame => frame.url().includes('/src/unlock/unlock.html')));
  const unlock = page.frames().find(frame => frame.url().includes('/src/unlock/unlock.html'));
  await unlock.locator('#unlock-password').fill('test-password'); await unlock.locator('#unlock-vault').click();
  await waitUntil(async () => (await options.evaluate(() => chrome.runtime.sendMessage({ type: 'VAULT_STATUS' }))).vault.state === 'unlocked');
  await bar('start', true); await page.waitForFunction(() => document.querySelector('h1').textContent.startsWith('译文'));
  assert.equal((await page.locator('body').textContent()).includes('local-mock-secret'), false);
  await bar('restore', true);
  // Popup + floating view expose both AI and original Google actions in either mode.
  for (const mode of ['simple', 'full']) {
    await worker.evaluate(mode => chrome.storage.local.set({ translationMode: mode }), mode);
    await popup.waitForFunction(mode => document.querySelector('.translation-view').classList.contains('simple-translate') === (mode === 'simple'), mode);
    assert.equal(await popup.locator('#translate-ai-page').isVisible(), true);
    assert.equal(await popup.locator('#translate-website').isVisible(), true);
    assert.equal(await popup.locator('#translate-google').isVisible(), true);
  }
  await popup.setViewportSize({ width: 400, height: 740 });
  for (const uiLanguage of ['en', 'zh-CN', 'zh-TW', 'ja', 'ko']) {
    await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage, translationMode: 'simple' }), uiLanguage);
    await popup.waitForFunction(uiLanguage => document.documentElement.lang === uiLanguage, uiLanguage);
    assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= 400), true, uiLanguage + ' popup fits');
  }
  await popup.screenshot({ path: '/tmp/transight-ai-page-popup.png' });
  await worker.evaluate(tabId => chrome.tabs.sendMessage(tabId, { type: 'SELECTION_OPEN', text: 'Translate this selection' }), tabId);
  // Action-row typography must match the toolbar, even inside a site's shadow UI.
  for (const mode of ['full', 'simple']) {
    await worker.evaluate(translationMode => chrome.storage.local.set({ translationMode }), mode);
    await popup.waitForFunction(mode => document.querySelector('.translation-view').classList.contains('simple-translate') === (mode === 'simple'), mode);
    await waitUntil(async () => (await worker.evaluate(({ tabId, mode }) => chrome.scripting.executeScript({ target: { tabId }, func: mode => {
      const root = chrome.dom.openOrClosedShadowRoot(document.querySelector('[data-transight="selection"]'));
      return root.querySelector('.translation-view').classList.contains('simple-translate') === (mode === 'simple');
    }, args: [mode] }), { tabId, mode }))[0].result);
    const actionFonts = await popup.evaluate(() => Object.fromEntries(['translate', 'cancel-translation', 'translate-ai-page', 'translate-website', 'translate-google'].map(id => {
      const style = getComputedStyle(document.getElementById(id));
      return [id, { size: style.fontSize, lineHeight: style.lineHeight }];
    })));
    const selectionFonts = (await worker.evaluate(tabId => chrome.scripting.executeScript({ target: { tabId }, func: () => {
      const root = chrome.dom.openOrClosedShadowRoot(document.querySelector('[data-transight="selection"]'));
      return Object.fromEntries(['translate', 'cancel-translation', 'translate-ai-page', 'translate-website', 'translate-google'].map(id => {
        const style = getComputedStyle(root.getElementById(id));
        return [id, { size: style.fontSize, lineHeight: style.lineHeight }];
      }));
    } }), tabId))[0].result;
    assert.deepEqual(actionFonts.translate, { size: '10.5px', lineHeight: '16.8px' }, 'preserve popup action size');
    assert.deepEqual(selectionFonts, actionFonts, mode + ': selection and popup action text match');
  }
  const selectionAction = await worker.evaluate(tabId => chrome.scripting.executeScript({ target: { tabId }, func: () => {
    const shadow = chrome.dom.openOrClosedShadowRoot(document.querySelector('[data-transight="selection"]'));
    const button = shadow.querySelector('#translate-ai-page'); return button && !button.closest('[hidden]');
  } }), tabId);
  assert.equal(selectionAction[0].result, true);
  await bar('close', true);
  await worker.evaluate(tabId => chrome.scripting.executeScript({ target: { tabId }, func: () => {
    chrome.dom.openOrClosedShadowRoot(document.querySelector('[data-transight="selection"]')).querySelector('#translate-ai-page').click();
  } }), tabId);
  await waitUntil(async () => Boolean(await bar('start')));
  await bar('close', true);
  // The standalone right-click fallback must use the originating tab, not itself.
  await worker.evaluate(tabId => chrome.storage.session.set({ contextTabId: tabId }), tabId);
  const fallback = await context.newPage(); await fallback.goto(origin + '/src/popup/popup.html?fallback=1');
  await fallback.locator('#translate-ai-page').click();
  await waitUntil(async () => Boolean(await bar('start')));
  await bar('close', true); await fallback.close();
  // Restricted pages report an AI-specific error instead of a Google failure.
  await worker.evaluate(() => chrome.storage.local.set({ uiLanguage: 'zh-CN' }));
  await popup.waitForFunction(() => document.documentElement.lang === 'zh-CN');
  const restrictedTab = await worker.evaluate(() => chrome.tabs.create({ url: 'chrome://settings', active: true }));
  await popup.evaluate(() => document.querySelector('#translate-ai-page').click());
  await popup.locator('#website-translation-status').waitFor({ state: 'visible' });
  assert.match(await popup.locator('#website-translation-status').textContent(), /AI 网页翻译/);
  assert.equal(await popup.locator('#website-translation-status').getAttribute('data-i18n'), 'aiPageUnavailable');
  await worker.evaluate(id => chrome.tabs.remove(id), restrictedTab.id);
  // Unit-style DOM cases in a real DOM: stale node, detached node, unsafe move.
  const enginePage = await context.newPage(); await enginePage.goto(base + '/engine');
  await enginePage.addScriptTag({ path: path.join(root, 'src/content/page-engine.js') });
  const cases = await enginePage.evaluate(() => {
    const engine = new TransightPageEngine(); const batch = engine.batch();
    const mapping = Object.fromEntries(batch.flatMap(block => block.segments.map(segment => [segment.id, 'Translated'])));
    const changed = document.querySelector('#change').firstChild; changed.data = 'Changed while pending';
    const detached = document.querySelector('h1'); detached.remove();
    const moved = document.querySelector('#action').firstChild; document.querySelector('[contenteditable]').append(moved);
    engine.apply(batch, mapping);
    return { moved: moved.data, changed: changed.data, detached: detached.textContent, link: document.querySelector('#link') === originalLink };
  });
  assert.equal(cases.moved, 'Press this button');
  assert.equal(cases.changed, 'Changed while pending'); assert.equal(cases.detached, 'Languages bring people closer'); assert.equal(cases.link, true);
  console.log('✓ AI page browser smoke: consent, model, DOM preservation, exclusions, dynamic text, toggle, safe restore, cancel, navigation, invalid mapping, target, Simple/Full and selection entry');
} finally {
  await context?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(temp, { recursive: true, force: true });
}
