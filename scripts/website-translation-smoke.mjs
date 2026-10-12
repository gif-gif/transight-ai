// Local UI regression only: intercept tabs.create, never send browsing URLs to Google.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(path.join(tmpdir(), 'transight-website-'));
let context;
try {
  const extension = path.join(temp, 'extension');
  await cp(path.join(root, 'dist'), extension, { recursive: true });
  context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
    executablePath: process.env.CHROMIUM_EXECUTABLE || chromium.executablePath(), channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport: { width: 400, height: 720 }
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.websiteTest = { url: 'https://example.com/article?q=hello&lang=en#part', created: [], query: [], fail: false };
    chrome.tabs.query = async options => { websiteTest.query.push(options); return [{ id: 999, url: websiteTest.url }]; };
    chrome.tabs.create = async options => {
      if (websiteTest.fail) throw Error('test failure');
      websiteTest.created.push(options); return { id: 1000 };
    };
  });
  await page.goto(`${origin}/src/popup/popup.html`);
  await page.locator('#translate-website:visible').waitFor();
  assert.equal(await page.locator('#setup').isVisible(), true, 'no API configuration is needed');
  await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(() => websiteTest.created), [], 'no external tab before a click');
  for (const mode of ['full', 'simple']) {
    await worker.evaluate(translationMode => chrome.storage.local.set({ translationMode }), mode);
    await page.waitForFunction(simple => document.querySelector('.translation-view').classList.contains('simple-translate') === simple, mode === 'simple');
    for (const target of ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt']) {
      await page.locator('#target').selectOption(target);
      const before = await page.evaluate(() => websiteTest.created.length);
      await page.locator('#translate-website').click();
      await page.waitForFunction(n => websiteTest.created.length === n + 1, before);
      const opened = new URL(await page.evaluate(() => websiteTest.created.at(-1).url));
      assert.equal(opened.origin, 'https://translate.google.com');
      assert.equal(opened.searchParams.get('tl'), target);
      assert.equal(opened.searchParams.get('sl'), 'auto');
      assert.equal(opened.searchParams.get('u'), 'https://example.com/article?q=hello&lang=en#part');
    }
  }
  // Remembered preferences changed outside the popup must also apply.
  await worker.evaluate(() => chrome.storage.local.set({ targetLanguagePreference: 'ko' }));
  await page.waitForFunction(() => document.querySelector('#target').value === 'ko');
  await page.locator('#translate-website').click();
  await page.waitForFunction(() => new URL(websiteTest.created.at(-1).url).searchParams.get('tl') === 'ko');
  const count = await page.evaluate(() => websiteTest.created.length);
  await page.evaluate(() => { websiteTest.url = 'chrome://settings'; });
  await page.locator('#translate-website').click();
  await page.locator('#website-translation-status:visible').waitFor();
  assert.equal(await page.locator('#website-translation-status').getAttribute('data-i18n'), 'websiteTranslationUnavailable');
  assert.equal(await page.evaluate(() => websiteTest.created.length), count);
  await page.evaluate(() => { websiteTest.url = 'https://example.com/'; websiteTest.fail = true; });
  await page.locator('#translate-website').click();
  await page.waitForFunction(() => document.querySelector('#website-translation-status').dataset.i18n === 'websiteTranslationFailed');
  assert.equal(await page.locator('#translate-website').isEnabled(), true, 'failure can be retried');
  await page.evaluate(() => { websiteTest.fail = false; });
  await page.locator('#translate-website').click();
  await page.waitForFunction(n => websiteTest.created.length === n + 1, count);
  assert.equal(await page.locator('#website-translation-status').isVisible(), false);
  const output = path.join(root, 'artifacts/website-translation'); await mkdir(output, { recursive: true });
  for (const mode of ['full', 'simple']) {
    await worker.evaluate(translationMode => chrome.storage.local.set({ translationMode }), mode);
    await page.waitForFunction(simple => document.querySelector('.translation-view').classList.contains('simple-translate') === simple, mode === 'simple');
    for (const language of ['en', 'zh-CN', 'zh-TW', 'ja', 'ko']) {
      await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage }), language);
      await page.waitForFunction(language => document.documentElement.lang === language, language);
      assert.equal(await page.locator('#translate-website').isVisible(), true);
      assert.ok(await page.locator('#translate-website').getAttribute('title'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#translate-website').scrollWidth <= document.querySelector('#translate-website').clientWidth), true);
      await page.screenshot({ path: path.join(output, `${mode}-${language}.png`), fullPage: true });
    }
  }
  await worker.evaluate(() => chrome.storage.session.set({ contextDraft: 'text', contextPageUrl: 'https://example.com/from-context-menu' }));
  await page.goto(`${origin}/src/popup/popup.html?fallback=1`);
  await page.locator('#target option').first().waitFor({ state: 'attached' });
  await page.locator('#translate-website:visible').waitFor();
  await page.locator('#translate-website').click();
  await page.waitForFunction(() => websiteTest.created.length === 1);
  assert.equal(new URL(await page.evaluate(() => websiteTest.created[0].url)).searchParams.get('u'), 'https://example.com/from-context-menu');
  assert.equal((await worker.evaluate(() => chrome.storage.session.get('contextPageUrl'))).contextPageUrl, undefined);
  assert.deepEqual(errors, []);
  console.log('PASS: Google URL, all 10 targets in both modes, no API setup, saved target sync, explicit click only, restricted pages, retry, five locales, right-click fallback original URL.');
} finally {
  await context?.close();
  await rm(temp, { recursive: true, force: true });
}
