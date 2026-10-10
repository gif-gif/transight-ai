// Isolated regression: popup Simple/Full modes with local mock responses only.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(path.join(tmpdir(), 'transight-popup-modes-'));
const requests = [], errors = [];
const server = http.createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  requests.push(JSON.parse(body));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ choices: [{ message: { content: 'Translated by ' + requests.at(-1).model } }] }));
});
let context;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const extension = path.join(temp, 'extension');
  await cp(path.join(root, 'dist'), extension, { recursive: true });
  context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
    executablePath: process.env.CHROMIUM_EXECUTABLE || chromium.executablePath(), channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport: { width: 400, height: 700 }
  });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  await worker.evaluate(async baseUrl => chrome.storage.local.set({ uiLanguage: 'en', settings: {
    baseUrl, models: ['first-model', 'second-model'], model: 'first-model', targetLanguage: 'zh-CN', consent: true, style: 'natural'
  } }), `http://127.0.0.1:${server.address().port}/v1`);
  const popup = await context.newPage();
  const done = async (page, count) => page.waitForFunction(count => {
    const cards = document.querySelectorAll('.result-card');
    return cards.length === count && [...cards].every(card => card.dataset.state === 'success');
  }, count);
  const mode = (page, simple) => page.waitForFunction(simple => document.querySelector('.translation-view').classList.contains('simple-translate') === simple, simple);
  await popup.goto(`${origin}/src/popup/popup.html`);
  await popup.locator('#translation-mode:visible').waitFor();
  await mode(popup, false);
  assert.equal(await popup.locator('#translate').isVisible(), true);
  await popup.locator('#source').fill('Hello across languages.');
  await popup.locator('#source-language').selectOption('en');
  await popup.locator('#translation-mode').click();
  await mode(popup, true); await done(popup, 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].model, 'first-model');
  assert.equal(await popup.locator('#source-language').inputValue(), 'en');
  assert.equal(await popup.locator('#translate').isVisible(), false);
  assert.equal(await popup.locator('#ui-language').isVisible(), true);
  assert.equal(await popup.locator('#settings').isVisible(), true);
  for (const selector of ['.copy-result', '.speak-result']) {
    assert.equal(await popup.locator(selector).isVisible(), true);
    assert.equal(await popup.locator(selector).isEnabled(), true);
  }
  assert.equal(await popup.evaluate(() => getComputedStyle(document.body).minHeight), '0px');
  const start = requests.length;
  await popup.locator('#source').fill('Editing');
  await popup.locator('#source').fill('Edited text.');
  await done(popup, 1);
  assert.equal(requests.length, start + 1, 'typing is debounced');
  await popup.locator('#target').selectOption('ja'); await done(popup, 1);
  assert.equal(requests.length, start + 2, 'Simple target change translates without a button');
  await popup.locator('#source-language').selectOption('fr'); await done(popup, 1);
  assert.equal(requests.length, start + 3, 'Simple source-language change translates');
  await popup.locator('#source').fill('');
  await popup.waitForTimeout(700);
  assert.equal(requests.length, start + 3, 'empty input never sends a request');
  await popup.reload(); await mode(popup, true);
  assert.equal(await popup.locator('#target').inputValue(), 'ja', 'target and mode persist after reopen');

  // Settings changes update open popups; popup changes update the settings switch.
  const options = await context.newPage();
  await options.goto(`${origin}/src/options/options.html`);
  await options.locator('#save:enabled').waitFor();
  assert.equal(await options.locator('#translation-mode').isChecked(), true);
  await options.locator('#translation-mode').uncheck(); await mode(popup, false);
  await popup.locator('#source').fill('Full mode waits for the button.');
  const fullStart = requests.length;
  await popup.waitForTimeout(700);
  assert.equal(requests.length, fullStart);
  await popup.locator('#translate').click(); await done(popup, 2);
  assert.deepEqual(requests.slice(fullStart).map(r => r.model).sort(), ['first-model', 'second-model']);
  await popup.locator('#translation-mode').click(); await done(popup, 1);
  await options.waitForFunction(() => document.querySelector('#translation-mode').checked);
  assert.equal(await popup.locator('#source').inputValue(), 'Full mode waits for the button.');
  assert.deepEqual((await worker.evaluate(() => chrome.storage.local.get('settings'))).settings.models, ['first-model', 'second-model']);

  // Initial selection has no translate button in Simple, so it must translate automatically.
  await popup.close();
  const selected = await context.newPage();
  await selected.addInitScript(() => {
    chrome.scripting.executeScript = async () => [{ result: { text: 'Selected webpage text.', context: { title: 'Local test' } } }];
  });
  const selectedStart = requests.length;
  await selected.goto(`${origin}/src/popup/popup.html`); await done(selected, 1);
  assert.equal(requests.length, selectedStart + 1);
  assert.equal(await selected.locator('#source').inputValue(), 'Selected webpage text.');

  // All five languages retain the mode icon and fit a 400px toolbar viewport.
  const output = path.join(root, 'artifacts/popup-modes'); await mkdir(output, { recursive: true });
  for (const language of ['en', 'zh-CN', 'zh-TW', 'ja', 'ko']) {
    await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage }), language);
    await selected.waitForFunction(language => document.documentElement.lang === language, language);
    assert.ok(await selected.locator('#translation-mode').getAttribute('aria-label'));
    assert.equal(await selected.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await selected.screenshot({ path: path.join(output, `simple-${language}.png`), fullPage: true });
  }
  await selected.locator('#translation-mode').click(); await done(selected, 2);
  await selected.screenshot({ path: path.join(output, 'full.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: popup defaults, switching, first/all models, debounce, language changes, persistence, settings sync, selected text, copy/speech controls, five-language layout.');
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
