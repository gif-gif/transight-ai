import { screenshotSmoke } from './screenshot-smoke.mjs';
import { speechSmoke } from './speech-smoke.mjs';
import { credentialSmoke } from './credential-smoke.mjs';
import { resolveBrowserLanguage } from '../src/shared/i18n.js';
import { contextMenuSmoke } from './context-menu-smoke.mjs';
import { multiModelSmoke } from './multi-model-smoke.mjs';
import { inspectSelectStyle, assertSelectStyle } from './select-style-smoke.mjs';
import { selectionSmoke } from './selection-smoke.mjs';
// Optional integration test: npm install --no-save playwright, then npm run test:browser.
// Override PLAYWRIGHT_MODULE / CHROMIUM_EXECUTABLE when using a bundled runtime.
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(path.join(tmpdir(), 'yijian-browser-'));
const requestedLocale = process.env.TEST_BROWSER_LOCALE || 'en-US';
const headless = process.env.TEST_BROWSER_HEADLESS === '1' || process.platform !== 'darwin';
let context;
let mode = 'success';
let modelsMode = 'success';
const modelRequests = [];
let releaseModels, modelRequestStarted;
const requests = [];
const modelBehaviors = new Map();
const server = http.createServer(async (req, res) => {
  if (req.url === '/sample' || req.url === '/sample?frame=1') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<html><body><h1>Reading across borders</h1><p id="sample">A little understanding brings us closer.</p></body></html>'); return; }
  if (req.url === '/v1/models') {
    modelRequests.push({ method: req.method, auth: req.headers.authorization });
    res.setHeader('Content-Type', 'application/json');
    if (modelsMode === 'delayed') {
      const gate = new Promise(resolve => { releaseModels = resolve; });
      modelRequestStarted?.(); await gate;
    }
    if (modelsMode === 'unauthorized') { res.writeHead(401); res.end('SECRET MODEL ECHO'); return; }
    if (modelsMode === 'unsupported') { res.writeHead(404); res.end('SECRET MODEL ECHO'); return; }
    if (modelsMode === 'invalid') { res.end('{"models":[]}'); return; }
    res.end(JSON.stringify({ data: modelsMode === 'empty' ? [] : [
      { id: 'z-model' }, { id: 'mock-translator' }, { id: 'mock-translator' }, { id: null }
    ] })); return;
  }
  if (req.url !== '/v1/chat/completions') { res.writeHead(404); res.end(); return; }
  let body = ''; for await (const chunk of req) body += chunk;
  const payload = JSON.parse(body);
  requests.push({ body: payload, auth: req.headers.authorization });
  const behavior = modelBehaviors.get(payload.model);
  if (behavior?.wait) await behavior.wait;
  if (behavior?.status) { res.writeHead(behavior.status); res.end('SECRET MODEL ERROR'); return; }
  res.setHeader('Content-Type', 'application/json');
  if (mode === 'unauthorized') { res.writeHead(401); res.end('{"secret":"must-not-be-rendered"}'); return; }
  if (mode === 'slow') await new Promise(resolve => setTimeout(resolve, 600));
  res.end(JSON.stringify({ choices: [{ message: { content: behavior?.text ?? (payload.model === 'z-model' ? '多一分理解，拉近彼此距离。' : '多一点理解，让我们更靠近。') }, finish_reason: 'stop' }] }));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const extension = path.join(temp, 'extension'); await mkdir(extension);
  for (const name of ['src', 'assets', '_locales', 'manifest.json']) await cp(path.join(root, 'dist', name), path.join(extension, name), { recursive: true });
  // CDP/action.openPopup does not grant activeTab like a physical toolbar click.
  // Only this disposable test copy gets <all_urls> to exercise real captureVisibleTab.
  // The shipped manifest remains unchanged; native activeTab granting needs manual QA.
  const testManifestPath = path.join(extension, 'manifest.json');
  const testManifest = JSON.parse(await readFile(testManifestPath, 'utf8'));
  testManifest.host_permissions = [...testManifest.host_permissions, '<all_urls>'];
  await writeFile(testManifestPath, JSON.stringify(testManifest));
  let executablePath = process.env.CHROMIUM_EXECUTABLE || chromium.executablePath();
  if (process.platform === 'darwin' && !headless) {
    // NSUserDefaults requires separate -AppleLanguages and value arguments.
    // Use a temporary launcher because Playwright rejects bare value arguments.
    const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
    const launcher = path.join(temp, 'localized-chromium');
    await writeFile(launcher, `#!/bin/sh\nexec ${quote(executablePath)} -AppleLanguages ${quote(`(${requestedLocale})`)} "$@"\n`, { mode: 0o755 });
    executablePath = launcher;
  }
  const launch = () => chromium.launchPersistentContext(path.join(temp, 'profile'), {
    executablePath,
    // macOS language arguments are treated as an extra target in headless mode.
    channel: 'chromium', headless,
    locale: requestedLocale,
    args: [`--lang=${requestedLocale}`, `--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    viewport: { width: 1120, height: 980 }
  });
  context = await launch();
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const uiLocale = await worker.evaluate(() => chrome.i18n.getUILanguage());
  console.log('Browser UI locale:', uiLocale, '(requested:', requestedLocale + ')');
  assert.equal(uiLocale.toLowerCase().split('-')[0], requestedLocale.toLowerCase().split('-')[0]);
  const displayLanguage = resolveBrowserLanguage(uiLocale);
  const chinese = displayLanguage.startsWith('zh');
  const catalog = JSON.parse(await readFile(path.join(root, '_locales', displayLanguage.replace('-', '_'), 'messages.json')));
  const msg = (key, value) => catalog[key].message.replace('$1', value ?? '');
  assert.equal(await worker.evaluate(() => chrome.i18n.getMessage('translate')), msg('translate'));
  assert.equal(await worker.evaluate(() => chrome.runtime.getManifest().name), msg('extensionName'));
  assert.equal(await worker.evaluate(() => chrome.i18n.getMessage('httpError', '503')), msg('httpError', '503'));

  const screenshotDir = path.join(root, 'artifacts', 'screenshots', requestedLocale); await mkdir(screenshotDir, { recursive: true });
  const errors = [];
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  async function assertBrandMark() {
    const mark = await page.locator('.brand-icon').evaluate(el => {
      const svg = el.querySelector('svg');
      return { text: el.textContent.trim(), width: el.getBoundingClientRect().width,
        iconWidth: Math.round(svg.getBoundingClientRect().width), paths: svg.querySelectorAll('path').length,
        hidden: el.getAttribute('aria-hidden'), color: getComputedStyle(el).color };
    });
    assert.deepEqual(mark, { text: '', width: 42, iconWidth: 28, paths: 3, hidden: 'true', color: 'rgb(255, 255, 255)' });
  }

  if (process.env.TEST_SCREENSHOT_ONLY === '1') {
    await worker.evaluate(baseUrl => chrome.storage.local.set({ settings: {
      baseUrl, model: 'mock-translator', models: ['mock-translator', 'z-model'], targetLanguage: 'zh-CN', style: 'natural', consent: true
    } }), `http://127.0.0.1:${server.address().port}/v1`);
    await page.goto(`chrome-extension://${id}/src/popup/popup.html`);
    const sample = await context.newPage();
    await sample.goto(`http://127.0.0.1:${server.address().port}/sample`);
    await screenshotSmoke({ context, worker, page, sample, requests, screenshotDir, msg, modelBehaviors, setMode: value => { mode = value; } });
  } else {
  await page.goto(`chrome-extension://${id}/src/popup/popup.html`);
  await page.locator('#setup:visible').waitFor();
  await assertBrandMark();
  await page.locator('#translate').click(); assert.equal(await page.locator('#status').innerText(), msg('connectFirst'));
  await page.goto(`chrome-extension://${id}/src/options/options.html`);
  await page.locator('#save:enabled').waitFor();
  await assertBrandMark();
  assert.equal(await page.locator('#save').innerText(), msg('save'));
  assert.equal(await page.locator('#toggle-key').innerText(), msg('show'));
  await page.locator('#toggle-key').click();
  assert.equal(await page.locator('#toggle-key').innerText(), msg('hide'));
  await page.locator('#toggle-key').click();
  assert.equal(await page.locator('#style option[value="natural"]').innerText(), msg('styleNatural'));
  // Exercise Chrome's real toolbar popup auto-sizing instead of faking its viewport.
  await worker.evaluate(async () => {
    const [window] = await chrome.windows.getAll({ windowTypes: ['normal'] });
    await chrome.windows.update(window.id, { focused: true });
    for (let attempt = 0; ; attempt++) {
      try { await chrome.action.openPopup({ windowId: window.id }); break; }
      catch (error) { if (attempt >= 19) throw error; await new Promise(resolve => setTimeout(resolve, 100)); }
    }
  });
  await page.waitForFunction(() => chrome.extension.getViews({ type: 'popup' })
    .some(view => view.document.readyState === 'complete' && view.innerWidth === 400));
  const popupSize = await page.evaluate(() => {
    const view = chrome.extension.getViews({ type: 'popup' })[0];
    return {
      viewport: view.innerWidth,
      height: view.innerHeight,
      minHeight: view.getComputedStyle(view.document.body).minHeight,
      sourceHeight: view.document.querySelector("#source").getBoundingClientRect().height,
      resultHeight: view.document.querySelector("#result").getBoundingClientRect().height,
      root: view.document.documentElement.getBoundingClientRect().width,
      body: view.document.body.getBoundingClientRect().width,
      scroll: view.document.documentElement.scrollWidth
    };
  });
  // Chrome also caps the popup to available screen space (498px in headless).
  const { height, ...layout } = popupSize;
  assert.ok(height > 0 && height <= 600);
  assert.deepEqual(layout, { viewport: 400, minHeight: '600px', sourceHeight: 70, resultHeight: 95, root: 400, body: 400, scroll: 400 });
  console.log('✓ Real toolbar popup size:', popupSize.viewport, '×', popupSize.height, '; source height:', popupSize.sourceHeight);
  await page.evaluate(() => chrome.extension.getViews({ type: 'popup' }).forEach(view => view.close()));
  const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
  await page.locator('#base-url').fill(baseUrl);
  await page.locator('#api-key').fill('local-test-key');
  // Model discovery works before a model, consent, or settings have been saved.
  await page.locator('#fetch-models').click();
  await page.locator('#model-list-field:visible').waitFor();
  assert.equal(modelRequests.at(-1).method, 'GET');
  assert.equal(modelRequests.at(-1).auth, 'Bearer local-test-key');
  assert.equal(await page.locator('#model').inputValue(), '');
  assert.equal(await page.locator('#consent').isChecked(), false);
  assert.equal(await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings), undefined);
  assert.deepEqual(await page.locator('#model-list input').evaluateAll(options => options.map(option => option.value)), ['mock-translator', 'z-model']);
  await page.locator('#model-list input[value="mock-translator"]').check();
  assert.equal(await page.locator('#model').inputValue(), 'mock-translator');
  // A failed refresh leaves manual model entry usable and does not expose bodies.
  for (const [failure, key] of [['unauthorized', 'http401'], ['unsupported', 'modelsUnsupported'], ['invalid', 'modelsInvalid'], ['empty', 'modelsEmpty']]) {
    modelsMode = failure;
    await page.locator('#fetch-models').click();
    await page.waitForFunction(expected => document.querySelector('#models-status').textContent === expected, msg(key));
    assert.equal(await page.locator('#model').inputValue(), 'mock-translator');
    assert.equal(await page.locator('#model-list-field').isHidden(), true);
    assert.equal((await page.locator('body').innerText()).includes('SECRET MODEL ECHO'), false);
  }
  // Denial must not start a network request (native prompts are not automated).
  const beforeDenial = modelRequests.length;
  await page.evaluate(() => { globalThis.originalPermissionContains = chrome.permissions.contains; chrome.permissions.contains = async () => false; });
  await page.locator('#fetch-models').click();
  await page.waitForFunction(expected => document.querySelector('#models-status').textContent === expected, msg('permissionMissing'));
  assert.equal(modelRequests.length, beforeDenial);
  await page.evaluate(() => { chrome.permissions.contains = globalThis.originalPermissionContains; });
  // In-flight results from an edited connection cannot populate a stale model list.
  modelsMode = 'delayed';
  const started = new Promise(resolve => { modelRequestStarted = resolve; });
  await page.locator('#fetch-models').click(); await started;
  assert.equal(await page.locator('#fetch-models').isDisabled(), true);
  await page.locator('#api-key').fill('changed-key');
  releaseModels();
  assert.equal(await page.locator('#model-list-field').isHidden(), true);
  assert.equal(await page.locator('#fetch-models').isEnabled(), true);
  await page.locator('#api-key').fill('local-test-key');
  modelsMode = 'success';
  await page.locator('#fetch-models').click();
  await page.locator('#model-list-field:visible').waitFor();
  assert.equal(await page.locator('#model-list input[value="mock-translator"]').isChecked(), true);
  await page.locator('#save').click(); assert.equal(await page.locator('#status').innerText(), msg('consentRequired'));
  await page.locator('#consent').check();
  await page.locator('#vault-password').fill('local-test-unlock-password');
  await page.locator('#vault-confirm').fill('local-test-unlock-password');
  await page.locator('#save').click();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('saved'));
  assert.equal(await worker.evaluate(async () => JSON.stringify(await chrome.storage.local.get(null)).includes('local-test-key')), false);
  assert.equal(await page.locator('#api-key').inputValue(), '');
  await page.locator('#lock-vault').click();
  await page.locator('#vault-unlock-fields:visible').waitFor();
  assert.equal(await page.locator('#fetch-models').isDisabled(), true);
  assert.equal(await page.locator('#test').isDisabled(), true);
  await page.locator('#unlock-password').fill('incorrect-unlock-password');
  await page.locator('#unlock-vault').click();
  await page.waitForFunction(expected => document.querySelector('#vault-status').textContent === expected, msg('vaultUnlockFailed'));
  await page.locator('#unlock-password').fill('local-test-unlock-password');
  await page.locator('#unlock-vault').click();
  await page.locator('#test:enabled').waitFor();
  await page.locator('#test').click();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('connectionSuccess', '多一点理解，让我们更靠近。'));
  for (const select of await page.locator('select:visible').all()) assertSelectStyle(await select.evaluate(inspectSelectStyle));
  await page.screenshot({ path: path.join(screenshotDir, 'options.png'), fullPage: true });
  await page.locator('#model').fill('unsaved'); await page.locator('#test').click();
  assert.equal(await page.locator('#status').innerText(), msg('saveFirst'));
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`chrome-extension://${id}/src/popup/popup.html`);
  await page.waitForFunction(() => document.querySelector('#setup').hidden);
  assert.equal(await page.locator('body').evaluate(element => element.getBoundingClientRect().width), 400);
  assert.equal(await page.locator('.language-row').evaluate(element => element.getBoundingClientRect().height), 30);
  assert.equal(await page.locator('.intro').count(), 0);
  assert.equal(await page.locator('.brand small').innerText(), msg('tagline'));
  assert.equal(await page.locator('html').getAttribute('lang'), displayLanguage);
  assert.equal(await page.locator('#source').getAttribute('placeholder'), msg('sourcePlaceholder'));
  assert.equal(await page.locator('#settings').getAttribute('aria-label'), msg('openSettings'));
  assert.equal(await page.locator('#target option[value="zh-CN"]').innerText(), msg('langZhCN'));
  assert.equal(await page.locator('#target').inputValue(), 'zh-CN');
  assert.equal(await page.locator('#source-language').isVisible(), true);
  assert.equal(await page.locator('#source-language').inputValue(), 'auto');
  assert.equal(await page.locator('#target').evaluate(el => el.getBoundingClientRect().width), await page.locator('#source-language').evaluate(el => el.getBoundingClientRect().width));
  assert.equal(await page.locator('#screenshot').count(), 0, 'popup has no screenshot entry');
  assert.equal(await page.locator('#ui-language svg').count(), 1);
  assert.equal((await page.locator('#ui-language').innerText()).trim(), '');
  assert.equal(await page.locator('.brand h1').innerText(), chinese ? msg('brandShort') + 'AI' : 'Transight AI');
  // The popup should remain usable when opened in a smaller standalone window.
  await page.setViewportSize({ width: 375, height: 600 });
  await page.goto(`chrome-extension://${id}/src/popup/popup.html?fallback=1`);
  await page.waitForFunction(() => document.documentElement.classList.contains('standalone'));
  assert.equal(await page.locator('body').evaluate(element => element.getBoundingClientRect().width), 375);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`chrome-extension://${id}/src/popup/popup.html`);
  await page.waitForFunction(() => document.querySelector('#setup').hidden);
  await page.locator('#source-language').selectOption('en');
  await page.locator('#source').fill('A little understanding brings us closer.');
  await page.locator('#translate').click();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('complete'));
  assert.equal(await page.locator('#result').innerText(), '多一点理解，让我们更靠近。');
  assert.equal(requests.at(-1).auth, 'Bearer local-test-key');
  // Manual UI language overrides preserve translation state and sync open pages.
  const en = JSON.parse(await readFile(path.join(root, '_locales/en/messages.json'), 'utf8'));
  const tw = JSON.parse(await readFile(path.join(root, '_locales/zh_TW/messages.json'), 'utf8'));
  const zh = JSON.parse(await readFile(path.join(root, '_locales/zh_CN/messages.json'), 'utf8'));
  const ja = JSON.parse(await readFile(path.join(root, '_locales/ja/messages.json'), 'utf8'));
  const ko = JSON.parse(await readFile(path.join(root, '_locales/ko/messages.json'), 'utf8'));
  const options = await context.newPage();
  await options.goto(`chrome-extension://${id}/src/options/options.html`);
  await options.waitForFunction(() => document.querySelector('#model').value === 'mock-translator');
  await options.locator('#model').fill('unsaved-model');
  await options.locator('#toggle-key').click();
  const switchLanguage = async (language, expected) => {
    await page.locator('#ui-language').click();
    await page.locator(`[data-language="${language}"]`).click();
    await page.waitForFunction(expected => document.querySelector('#translate-label').textContent === expected, expected);
  };
  for (const [language, catalog] of [['ja', ja], ['ko', ko], ['en', en], ['zh-CN', zh], ['zh-TW', tw]]) {
    await switchLanguage(language, catalog.translate.message);
    await options.waitForFunction(expected => document.querySelector('#toggle-key').textContent === expected, catalog.hide.message);
    assert.equal(await options.locator('#model').inputValue(), 'unsaved-model');
    assert.equal(await options.locator('#api-key').getAttribute('type'), 'text');
    assert.equal(await page.locator('#source').inputValue(), 'A little understanding brings us closer.');
    assert.equal(await page.locator('#result').innerText(), '多一点理解，让我们更靠近。');
    assert.equal(await page.locator('#target').inputValue(), 'zh-CN');
    assert.equal(await page.locator('#target option').count(), 10);
    assert.equal(await page.locator('#status').innerText(), catalog.complete.message);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 400);
  }
  await page.reload();
  await page.waitForFunction(expected => document.querySelector('#translate-label').textContent === expected, tw.translate.message);
  assert.equal(await page.locator('[data-language="zh-TW"]').getAttribute('aria-pressed'), 'true');
  await page.locator('#ui-language').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#ui-language-menu').isHidden(), true);
  assert.equal(await page.locator('#ui-language').evaluate(el => el === document.activeElement), true);
  await switchLanguage('auto', msg('translate'));
  await options.close();
  await page.locator('#source-language').selectOption('en');
  await page.locator('#source').fill('A little understanding brings us closer.');
  await page.locator('#translate').click();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('complete'));
  assert.equal(await worker.evaluate(async () => (await chrome.storage.local.get('uiLanguage')).uiLanguage), 'auto');
  for (const select of await page.locator('select:visible').all()) assertSelectStyle(await select.evaluate(inspectSelectStyle));
  assert.ok(requests.at(-1).body.messages[0].content.includes('Source language: English (en).'));
  assert.equal(await page.locator('#ui-language').isVisible(), true);
  await page.screenshot({ path: path.join(screenshotDir, 'popup.png'), fullPage: true });
  await page.locator('#copy').click();
  await page.locator('#copy[data-copied="true"]').waitFor();
  assert.equal(await page.locator('#copy').textContent(), '');
  assert.equal(await page.locator('#status').innerText(), msg('complete'));
  await page.locator('#copy[data-copied="false"]').waitFor();
  await page.locator('#source').fill('Again'); mode = 'unauthorized'; await page.locator('#translate').click();
  const authPrompt = msg('http401') + msg('authSettingsPrompt');
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, authPrompt);
  const settingsLink = page.locator('#status .settings-link');
  assert.equal(await settingsLink.textContent(), msg('configureApiKey'));
  assert.equal(await page.locator('#result-card .settings-link').textContent(), msg('configureApiKey'));
  assert.ok((await settingsLink.getAttribute('href')).endsWith('/src/options/options.html'));
  const settingsOpened = context.waitForEvent('page');
  await settingsLink.focus(); await page.keyboard.press('Enter');
  const authOptions = await settingsOpened;
  await authOptions.waitForURL('**/src/options/options.html');
  await authOptions.locator('#save:enabled').waitFor();
  await authOptions.close();
  console.log('✓ Authentication settings link: localized prompt, result card, keyboard navigation');
  assert.equal(await page.locator('#copy').isDisabled(), true);
  assert.equal((await page.locator('body').innerText()).includes('must-not-be-rendered'), false);
  const sample = await context.newPage();
  await sample.goto(`http://127.0.0.1:${server.address().port}/sample`);
  const tabId = await worker.evaluate(async () => (await chrome.tabs.query({})).find(tab => tab.url?.endsWith('/sample')).id);
  const storageReadable = await worker.evaluate(async tabId => {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: async () => {
      try { await chrome.storage.local.get('settings'); return true; } catch { return false; }
    } });
    return results[0].result;
  }, tabId);
  assert.equal(storageReadable, false);
  await selectionSmoke({ context, worker, page, sample, tabId, requests, screenshotDir, msg, setMode: value => { mode = value; } });
  assert.deepEqual(errors, []);
  await multiModelSmoke({ context, worker, page, sample, tabId, requests, screenshotDir, msg, modelBehaviors, setMode: value => { mode = value; } });
  await contextMenuSmoke({ context, worker, sample, tabId, requests, screenshotDir, msg, modelBehaviors, setMode: value => { mode = value; } });
  assert.deepEqual(errors, []);
  await speechSmoke({ context, worker, page, sample, tabId, screenshotDir, msg, modelBehaviors, setMode: value => { mode = value; } });
  await screenshotSmoke({ context, worker, page, sample, requests, screenshotDir, msg, modelBehaviors, setMode: value => { mode = value; } });
  await credentialSmoke({ context, worker, page, sample, tabId, requests, screenshotDir, msg, modelBehaviors, setMode: value => { mode = value; },
    restart: async () => {
      await context.close(); context = await launch();
      const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      return { context, worker, page };
    }
  });
  assert.deepEqual(errors, []);
  console.log('✓ Browser smoke: model discovery, selection, failure, permission denial and stale-response cancellation; real toolbar popup sizing and standalone narrow viewport, initial setup, consent, save, test connection, unsaved edits, translation, copy, HTTP errors, panel dismissal and credential isolation');
  }
  console.log('Screenshots:', screenshotDir);
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
